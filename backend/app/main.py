# app/main.py
"""
Intelligent Resume Screening & Ranking System
FastAPI Backend Entry Point
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database.db import init_sqlite_db, init_mongo_db
from app.routes.api import router

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Lifespan (startup/shutdown)
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Resume Screening System...")

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Initialize database
    if settings.DB_TYPE == "mongodb":
        await init_mongo_db()
    else:
        await init_sqlite_db()
        logger.info("✅ SQLite database initialized")

    logger.info(f"📁 Upload directory: {settings.UPLOAD_DIR}")

    # Pre-warm NLP models (errors are non-fatal, fallbacks exist)
    try:
        from app.parser.resume_parser import _get_nlp
        _get_nlp()
    except Exception:
        pass
    try:
        from app.services.matcher import _get_st_model
        _get_st_model()
    except Exception:
        pass
    logger.info(f"🌐 API running at http://{settings.APP_HOST}:{settings.APP_PORT}")
    logger.info(f"📖 Swagger docs: http://localhost:{settings.APP_PORT}/docs")

    yield

    logger.info("🛑 Shutting down...")


# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────
app = FastAPI(
    title="Intelligent Resume Screening & Ranking System",
    description="API for automated resume parsing, skill matching, and candidate ranking.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
app.include_router(router, prefix="/api/v1", tags=["Resume Screening"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "running",
        "app": "Intelligent Resume Screening System",
        "version": "1.0.0",
        "docs": "/docs",
        "database": settings.DB_TYPE,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "db": settings.DB_TYPE}
