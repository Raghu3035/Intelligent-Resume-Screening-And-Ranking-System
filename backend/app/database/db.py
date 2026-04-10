# app/database/db.py
"""
Database abstraction layer.
Supports SQLite (default) and MongoDB Atlas.
Switch via DB_TYPE in .env
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import Column, String, Float, Text, DateTime, Integer
from sqlalchemy.dialects.sqlite import JSON
import datetime
import json
import uuid

from app.config import settings


# ─────────────────────────────────────────────
# SQLAlchemy Base
# ─────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


class CandidateModel(Base):
    """SQLAlchemy ORM model for candidates table."""
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, default="")
    phone = Column(String, default="")
    skills = Column(Text, default="[]")           # JSON string
    experience = Column(Float, default=0.0)
    education = Column(Text, default="")
    raw_text = Column(Text, default="")
    filename = Column(String, default="")
    job_description = Column(Text, default="")
    match_score = Column(Float, default=0.0)
    skill_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    bert_score = Column(Float, default=0.0)
    matched_skills = Column(Text, default="[]")   # JSON string
    missing_skills = Column(Text, default="[]")   # JSON string
    rank = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "skills": json.loads(self.skills) if isinstance(self.skills, str) else self.skills,
            "experience": self.experience,
            "education": self.education,
            "raw_text": self.raw_text,
            "filename": self.filename,
            "job_description": self.job_description,
            "match_score": self.match_score,
            "skill_score": self.skill_score,
            "experience_score": self.experience_score,
            "bert_score": self.bert_score,
            "matched_skills": json.loads(self.matched_skills) if isinstance(self.matched_skills, str) else self.matched_skills,
            "missing_skills": json.loads(self.missing_skills) if isinstance(self.missing_skills, str) else self.missing_skills,
            "rank": self.rank,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


# ─────────────────────────────────────────────
# SQLite Engine
# ─────────────────────────────────────────────
sqlite_engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.SQLITE_DB_PATH}",
    echo=settings.DEBUG,
)

AsyncSessionLocal = sessionmaker(
    bind=sqlite_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_sqlite_db():
    """Create tables if they don't exist."""
    async with sqlite_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency injection for SQLite session."""
    async with AsyncSessionLocal() as session:
        yield session


# ─────────────────────────────────────────────
# MongoDB (optional)
# ─────────────────────────────────────────────
mongo_db = None


async def init_mongo_db():
    """Initialize MongoDB connection if configured."""
    global mongo_db
    if settings.DB_TYPE == "mongodb" and settings.MONGODB_URI:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(settings.MONGODB_URI)
            mongo_db = client[settings.MONGODB_DB_NAME]
            # Ping to verify connection
            await client.admin.command("ping")
            print("✅ Connected to MongoDB Atlas")
        except Exception as e:
            print(f"⚠️  MongoDB connection failed: {e}. Falling back to SQLite.")
            mongo_db = None
    else:
        print("✅ Using SQLite database")
