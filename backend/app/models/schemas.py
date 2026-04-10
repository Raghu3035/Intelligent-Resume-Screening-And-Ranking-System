# app/models/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class CandidateBase(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    skills: List[str] = []
    experience: float = 0.0
    education: str = ""


class CandidateCreate(CandidateBase):
    raw_text: str = ""
    filename: str = ""


class CandidateResult(CandidateBase):
    id: str
    raw_text: str = ""
    filename: str = ""
    job_description: str = ""
    match_score: float = 0.0
    skill_score: float = 0.0
    experience_score: float = 0.0
    bert_score: float = 0.0
    tfidf_score: float = 0.0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    rank: int = 0
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True


class JobDescriptionInput(BaseModel):
    description: str = Field(..., min_length=10, description="Job description text")
    required_skills: Optional[List[str]] = None
    min_experience: Optional[float] = 0.0


class AnalyzeRequest(BaseModel):
    job_description: str
    candidate_ids: Optional[List[str]] = None  # None = analyze all
    min_experience: Optional[float] = 0.0


class AnalyzeResponse(BaseModel):
    total_candidates: int
    job_skills: List[str]
    results: List[CandidateResult]
    top_candidate: Optional[CandidateResult] = None


class ParsedResume(BaseModel):
    name: str = "Unknown"
    email: str = ""
    phone: str = ""
    skills: List[str] = []
    experience: float = 0.0
    education: str = ""
    raw_text: str = ""


class UploadResponse(BaseModel):
    success: bool
    message: str
    candidate_id: str = ""
    parsed: Optional[ParsedResume] = None


class FilterParams(BaseModel):
    min_score: Optional[float] = 0.0
    max_score: Optional[float] = 100.0
    skills: Optional[List[str]] = None
    min_experience: Optional[float] = 0.0
    search_name: Optional[str] = None
