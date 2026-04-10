# app/services/candidate_service.py
"""
Candidate Service
Handles all database operations for candidates.
Supports SQLite and MongoDB.
"""

import json
import uuid
import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from app.database.db import CandidateModel, mongo_db
from app.config import settings
import logging

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# SQLite Operations
# ─────────────────────────────────────────────

async def create_candidate_sqlite(db: AsyncSession, data: dict) -> dict:
    """Insert a new candidate into SQLite."""
    candidate = CandidateModel(
        id=data.get("id", str(uuid.uuid4())),
        name=data.get("name", "Unknown"),
        email=data.get("email", ""),
        phone=data.get("phone", ""),
        skills=json.dumps(data.get("skills", [])),
        experience=data.get("experience", 0.0),
        education=data.get("education", ""),
        raw_text=data.get("raw_text", ""),
        filename=data.get("filename", ""),
        job_description=data.get("job_description", ""),
        match_score=data.get("match_score", 0.0),
        skill_score=data.get("skill_score", 0.0),
        experience_score=data.get("experience_score", 0.0),
        bert_score=data.get("bert_score", 0.0),
        matched_skills=json.dumps(data.get("matched_skills", [])),
        missing_skills=json.dumps(data.get("missing_skills", [])),
        rank=data.get("rank", 0),
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate.to_dict()


async def get_all_candidates_sqlite(db: AsyncSession) -> List[dict]:
    """Fetch all candidates from SQLite, ordered by rank."""
    result = await db.execute(
        select(CandidateModel).order_by(CandidateModel.rank)
    )
    candidates = result.scalars().all()
    return [c.to_dict() for c in candidates]


async def get_candidate_by_id_sqlite(db: AsyncSession, candidate_id: str) -> Optional[dict]:
    """Fetch single candidate by ID."""
    result = await db.execute(
        select(CandidateModel).where(CandidateModel.id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    return candidate.to_dict() if candidate else None


async def update_candidate_sqlite(db: AsyncSession, candidate_id: str, data: dict) -> Optional[dict]:
    """Update candidate record."""
    update_data = {}
    for key, val in data.items():
        if key in ("skills", "matched_skills", "missing_skills") and isinstance(val, list):
            update_data[key] = json.dumps(val)
        elif key not in ("id", "timestamp"):
            update_data[key] = val

    await db.execute(
        update(CandidateModel)
        .where(CandidateModel.id == candidate_id)
        .values(**update_data)
    )
    await db.commit()
    return await get_candidate_by_id_sqlite(db, candidate_id)


async def delete_candidate_sqlite(db: AsyncSession, candidate_id: str) -> bool:
    """Delete candidate by ID."""
    result = await db.execute(
        delete(CandidateModel).where(CandidateModel.id == candidate_id)
    )
    await db.commit()
    return result.rowcount > 0


async def clear_all_candidates_sqlite(db: AsyncSession):
    """Clear all candidates (for fresh analysis)."""
    await db.execute(delete(CandidateModel))
    await db.commit()


# ─────────────────────────────────────────────
# MongoDB Operations
# ─────────────────────────────────────────────

async def create_candidate_mongo(data: dict) -> dict:
    """Insert candidate into MongoDB."""
    data["_id"] = data.get("id", str(uuid.uuid4()))
    data["timestamp"] = datetime.datetime.utcnow().isoformat()
    await mongo_db["candidates"].insert_one(data)
    data["id"] = data.pop("_id")
    return data


async def get_all_candidates_mongo() -> List[dict]:
    """Fetch all candidates from MongoDB."""
    cursor = mongo_db["candidates"].find().sort("rank", 1)
    candidates = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        candidates.append(doc)
    return candidates


async def get_candidate_by_id_mongo(candidate_id: str) -> Optional[dict]:
    """Fetch single candidate from MongoDB."""
    doc = await mongo_db["candidates"].find_one({"_id": candidate_id})
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def update_candidate_mongo(candidate_id: str, data: dict) -> Optional[dict]:
    """Update candidate in MongoDB."""
    data.pop("id", None)
    data.pop("_id", None)
    await mongo_db["candidates"].update_one(
        {"_id": candidate_id}, {"$set": data}
    )
    return await get_candidate_by_id_mongo(candidate_id)


async def delete_candidate_mongo(candidate_id: str) -> bool:
    """Delete candidate from MongoDB."""
    result = await mongo_db["candidates"].delete_one({"_id": candidate_id})
    return result.deleted_count > 0


async def clear_all_candidates_mongo():
    """Clear all candidates from MongoDB."""
    await mongo_db["candidates"].delete_many({})


# ─────────────────────────────────────────────
# Unified Interface (auto-selects backend)
# ─────────────────────────────────────────────

def _use_mongo() -> bool:
    return settings.DB_TYPE == "mongodb" and mongo_db is not None


async def create_candidate(db: AsyncSession, data: dict) -> dict:
    if _use_mongo():
        return await create_candidate_mongo(data)
    return await create_candidate_sqlite(db, data)


async def get_all_candidates(db: AsyncSession) -> List[dict]:
    if _use_mongo():
        return await get_all_candidates_mongo()
    return await get_all_candidates_sqlite(db)


async def get_candidate_by_id(db: AsyncSession, candidate_id: str) -> Optional[dict]:
    if _use_mongo():
        return await get_candidate_by_id_mongo(candidate_id)
    return await get_candidate_by_id_sqlite(db, candidate_id)


async def update_candidate(db: AsyncSession, candidate_id: str, data: dict) -> Optional[dict]:
    if _use_mongo():
        return await update_candidate_mongo(candidate_id, data)
    return await update_candidate_sqlite(db, candidate_id, data)


async def delete_candidate(db: AsyncSession, candidate_id: str) -> bool:
    if _use_mongo():
        return await delete_candidate_mongo(candidate_id)
    return await delete_candidate_sqlite(db, candidate_id)


async def clear_all_candidates(db: AsyncSession):
    if _use_mongo():
        return await clear_all_candidates_mongo()
    return await clear_all_candidates_sqlite(db)
