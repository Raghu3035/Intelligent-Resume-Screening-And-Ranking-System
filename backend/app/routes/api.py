# app/routes/api.py
"""
REST API Routes
POST /upload-resume
POST /analyze
GET  /results
GET  /candidate/{id}
DELETE /candidate/{id}
GET  /export/csv
GET  /export/pdf
POST /clear
"""

import os
import uuid
import json
import logging
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
import io

from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse, CandidateResult,
    UploadResponse, FilterParams
)
from app.parser.resume_parser import parse_resume, extract_text
from app.parser.skill_extractor import extract_skills_from_text, extract_job_skills
from app.services.candidate_service import (
    create_candidate, get_all_candidates, get_candidate_by_id,
    update_candidate, delete_candidate, clear_all_candidates
)
from app.services.matcher import match_candidate, rank_candidates
from app.services.export_service import generate_csv, generate_pdf_report
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


# ─────────────────────────────────────────────
# POST /upload-resume
# ─────────────────────────────────────────────

@router.post("/upload-resume", response_model=UploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and parse a single resume."""
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Use PDF, DOCX, or TXT."
        )

    # Validate size
    content = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB."
        )

    # Save file temporarily
    candidate_id = str(uuid.uuid4())
    save_path = os.path.join(settings.UPLOAD_DIR, f"{candidate_id}{ext}")
    with open(save_path, "wb") as f:
        f.write(content)

    # Parse resume
    try:
        parsed = parse_resume(save_path)
        parsed["skills"] = extract_skills_from_text(parsed.get("raw_text", ""))
    except ValueError as e:
        os.remove(save_path)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        os.remove(save_path)
        logger.error(f"Parse error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

    # Store in DB
    candidate_data = {
        "id": candidate_id,
        "filename": file.filename,
        **parsed
    }
    saved = await create_candidate(db, candidate_data)

    return UploadResponse(
        success=True,
        message=f"Resume '{file.filename}' uploaded and parsed successfully.",
        candidate_id=candidate_id,
        parsed={
            "name": parsed.get("name", ""),
            "email": parsed.get("email", ""),
            "phone": parsed.get("phone", ""),
            "skills": parsed.get("skills", []),
            "experience": parsed.get("experience", 0.0),
            "education": parsed.get("education", ""),
            "raw_text": parsed.get("raw_text", "")[:500],  # Preview only
        }
    )


@router.post("/upload-resumes", response_model=List[UploadResponse])
async def upload_multiple_resumes(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload multiple resumes at once."""
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Max 20 files per batch.")

    results = []
    for file in files:
        try:
            # Reuse single upload logic
            from fastapi import Request
            single_result = await upload_resume(file=file, db=db)
            results.append(single_result)
        except HTTPException as e:
            results.append(UploadResponse(
                success=False,
                message=f"{file.filename}: {e.detail}",
                candidate_id=""
            ))
    return results


# ─────────────────────────────────────────────
# POST /analyze
# ─────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_candidates(
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Run matching algorithm on all (or selected) candidates."""
    if not request.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    # Get candidates
    all_candidates = await get_all_candidates(db)
    if not all_candidates:
        raise HTTPException(status_code=404, detail="No candidates found. Upload resumes first.")

    # Filter by IDs if specified
    if request.candidate_ids:
        candidates = [c for c in all_candidates if c["id"] in request.candidate_ids]
    else:
        candidates = all_candidates

    # Extract job skills
    job_skills = extract_job_skills(request.job_description)

    # Match each candidate
    matched = []
    for candidate in candidates:
        result = match_candidate(
            candidate=candidate,
            job_description=request.job_description,
            job_skills=job_skills,
            required_experience=request.min_experience or 0.0
        )
        matched.append(result)

    # Rank candidates
    ranked = rank_candidates(matched)

    # Update DB with scores
    for candidate in ranked:
        await update_candidate(db, candidate["id"], {
            "match_score": candidate["match_score"],
            "skill_score": candidate["skill_score"],
            "experience_score": candidate["experience_score"],
            "matched_skills": candidate["matched_skills"],
            "missing_skills": candidate["missing_skills"],
            "job_description": request.job_description,
            "rank": candidate["rank"],
        })

    return AnalyzeResponse(
        total_candidates=len(ranked),
        job_skills=job_skills,
        results=[CandidateResult(**c) for c in ranked],
        top_candidate=CandidateResult(**ranked[0]) if ranked else None
    )


# ─────────────────────────────────────────────
# GET /results
# ─────────────────────────────────────────────

@router.get("/results", response_model=List[CandidateResult])
async def get_results(
    min_score: float = Query(0.0, ge=0, le=100),
    max_score: float = Query(100.0, ge=0, le=100),
    min_experience: float = Query(0.0, ge=0),
    skill: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get all candidates with optional filters."""
    candidates = await get_all_candidates(db)

    # Apply filters
    filtered = []
    for c in candidates:
        # Score filter
        if not (min_score <= c.get("match_score", 0) <= max_score):
            continue
        # Experience filter
        if c.get("experience", 0) < min_experience:
            continue
        # Skill filter
        if skill:
            skills_lower = [s.lower() for s in c.get("skills", [])]
            if skill.lower() not in skills_lower:
                continue
        # Name search
        if search:
            if search.lower() not in c.get("name", "").lower():
                continue
        filtered.append(c)

    return [CandidateResult(**c) for c in filtered]


# ─────────────────────────────────────────────
# GET /candidate/{id}
# ─────────────────────────────────────────────

@router.get("/candidate/{candidate_id}", response_model=CandidateResult)
async def get_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a single candidate by ID."""
    candidate = await get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return CandidateResult(**candidate)


@router.delete("/candidate/{candidate_id}")
async def remove_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a candidate."""
    deleted = await delete_candidate(db, candidate_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return {"success": True, "message": "Candidate deleted."}


# ─────────────────────────────────────────────
# EXPORT ROUTES
# ─────────────────────────────────────────────

@router.get("/export/csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    """Export results as CSV."""
    candidates = await get_all_candidates(db)
    csv_bytes = generate_csv(candidates)
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=resume_screening_results.csv"}
    )


@router.get("/export/pdf")
async def export_pdf(db: AsyncSession = Depends(get_db)):
    """Export results as PDF."""
    candidates = await get_all_candidates(db)
    job_desc = candidates[0].get("job_description", "") if candidates else ""
    pdf_bytes = generate_pdf_report(candidates, job_desc)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=resume_screening_report.pdf"}
    )


# ─────────────────────────────────────────────
# UTILITY ROUTES
# ─────────────────────────────────────────────

@router.post("/clear")
async def clear_candidates(db: AsyncSession = Depends(get_db)):
    """Clear all candidates from the database."""
    await clear_all_candidates(db)
    return {"success": True, "message": "All candidates cleared."}


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Get summary statistics."""
    candidates = await get_all_candidates(db)
    if not candidates:
        return {"total": 0, "avg_score": 0, "top_score": 0, "analyzed": 0}

    analyzed = [c for c in candidates if c.get("match_score", 0) > 0]
    scores = [c.get("match_score", 0) for c in analyzed]

    return {
        "total": len(candidates),
        "analyzed": len(analyzed),
        "avg_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "top_score": round(max(scores), 2) if scores else 0,
        "min_score": round(min(scores), 2) if scores else 0,
    }
