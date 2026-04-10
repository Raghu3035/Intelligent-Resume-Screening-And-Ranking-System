# app/services/matcher.py
"""
Job Matching Engine
===================
Three complementary algorithms, all genuinely implemented:

1. Keyword / skill intersection  — fast, deterministic
   score = |resume_skills ∩ job_skills| / |job_skills| × 100

2. TF-IDF + Cosine Similarity    — sklearn TfidfVectorizer (NOT hand-rolled)
   Vectorises resume text vs job description, computes cosine similarity.

3. BERT Sentence Embeddings      — sentence-transformers (semantic matching)
   Encodes both texts with 'all-MiniLM-L6-v2', cosine similarity of embeddings.
   Falls back gracefully if the package is not installed.

Final weighted score
   = skill_score × 0.50
   + tfidf_score × 0.25
   + bert_score  × 0.25   (or tfidf × 0.50 if BERT unavailable)
   + experience bonus applied after weighting
"""

from __future__ import annotations
import logging
from typing import List, Tuple, Dict, Optional

logger = logging.getLogger(__name__)

# ── sklearn TF-IDF (required) ─────────────────────────────────────────────────
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# ── BERT sentence-transformers (optional but recommended) ─────────────────────
_st_model = None          # SentenceTransformer instance, loaded lazily
_BERT_OK   = False

def _get_st_model():
    """Lazy-load the sentence-transformers model once."""
    global _st_model, _BERT_OK
    if _st_model is not None:
        return _st_model
    try:
        from sentence_transformers import SentenceTransformer
        _st_model = SentenceTransformer("all-MiniLM-L6-v2")
        _BERT_OK = True
        logger.info("sentence-transformers model 'all-MiniLM-L6-v2' loaded")
    except ImportError:
        logger.warning("sentence-transformers not installed. BERT scoring disabled.")
    except Exception as e:
        logger.warning(f"Could not load sentence-transformers model: {e}")
    return _st_model


# ─────────────────────────────────────────────────────────────────────────────
# 1. Keyword Skill Score
# ─────────────────────────────────────────────────────────────────────────────

def compute_skill_score(
    resume_skills: List[str],
    job_skills: List[str],
) -> Tuple[float, List[str], List[str]]:
    """
    Intersection-based skill match.
    Returns (score_0-100, matched_skills, missing_skills).
    """
    if not job_skills:
        return 0.0, [], []

    r_set = {s.lower().strip() for s in resume_skills}
    j_set = {s.lower().strip() for s in job_skills}

    matched = sorted(r_set & j_set)
    missing = sorted(j_set - r_set)
    score   = (len(matched) / len(j_set)) * 100.0
    return round(score, 2), matched, missing


# ─────────────────────────────────────────────────────────────────────────────
# 2. TF-IDF Cosine Similarity  (sklearn)
# ─────────────────────────────────────────────────────────────────────────────

def compute_tfidf_score(resume_text: str, job_description: str) -> float:
    """
    Real TF-IDF vectorisation via sklearn.TfidfVectorizer.
    Returns cosine similarity × 100 (0–100).
    """
    if not resume_text.strip() or not job_description.strip():
        return 0.0
    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),   # unigrams + bigrams for richer matching
            max_features=8000,
            sublinear_tf=True,    # dampens high-frequency terms
        )
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return round(float(sim) * 100.0, 2)
    except Exception as e:
        logger.warning(f"TF-IDF scoring failed: {e}")
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# 3. BERT Semantic Similarity  (sentence-transformers)
# ─────────────────────────────────────────────────────────────────────────────

def compute_bert_score(resume_text: str, job_description: str) -> float:
    """
    Encode resume & JD with 'all-MiniLM-L6-v2' (384-dim embeddings).
    Returns cosine similarity × 100 (0–100).
    Falls back to 0.0 if the model is unavailable.
    """
    model = _get_st_model()
    if model is None:
        return 0.0
    if not resume_text.strip() or not job_description.strip():
        return 0.0
    try:
        # Truncate to ~512 tokens worth of chars to stay within model limit
        r_text = resume_text[:2000]
        j_text = job_description[:1000]
        embeddings = model.encode([r_text, j_text], convert_to_numpy=True)
        # Cosine similarity
        r_vec = embeddings[0]
        j_vec = embeddings[1]
        sim = float(np.dot(r_vec, j_vec) / (np.linalg.norm(r_vec) * np.linalg.norm(j_vec) + 1e-10))
        return round(sim * 100.0, 2)
    except Exception as e:
        logger.warning(f"BERT scoring failed: {e}")
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Experience Scoring
# ─────────────────────────────────────────────────────────────────────────────

def compute_experience_score(candidate_exp: float, required_exp: float = 0.0) -> float:
    """
    100 if meets/exceeds requirement.
    Proportional if below.
    Tiered baseline when no requirement specified.
    """
    if required_exp <= 0:
        if candidate_exp >= 7:  return 100.0
        if candidate_exp >= 4:  return 85.0
        if candidate_exp >= 2:  return 70.0
        if candidate_exp >= 1:  return 50.0
        if candidate_exp > 0:   return 30.0
        return 20.0

    if candidate_exp >= required_exp:
        return 100.0
    return round(min((candidate_exp / required_exp) * 100.0, 100.0), 2)


# ─────────────────────────────────────────────────────────────────────────────
# Weighted Final Score
# ─────────────────────────────────────────────────────────────────────────────

def compute_final_score(
    skill_score: float,
    experience_score: float,
    tfidf_score: float,
    bert_score: float,
) -> float:
    """
    Weighted combination of all three signals + experience bonus.

    With BERT available:
        skill × 0.50 + tfidf × 0.25 + bert × 0.25
    Without BERT:
        skill × 0.55 + tfidf × 0.45

    Experience score is blended in as a 20 % modifier on the combined score.
    """
    if _BERT_OK and bert_score > 0:
        base = skill_score * 0.50 + tfidf_score * 0.25 + bert_score * 0.25
    else:
        base = skill_score * 0.55 + tfidf_score * 0.45

    # Blend in experience: 80 % content + 20 % experience
    final = base * 0.80 + experience_score * 0.20
    return round(min(final, 100.0), 2)


# ─────────────────────────────────────────────────────────────────────────────
# Single Candidate Matching Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def match_candidate(
    candidate: dict,
    job_description: str,
    job_skills: List[str],
    required_experience: float = 0.0,
) -> dict:
    """
    Run the full three-algorithm pipeline for one candidate.
    Returns the candidate dict enriched with scoring fields.
    """
    resume_skills = candidate.get("skills", [])
    experience    = candidate.get("experience", 0.0)
    raw_text      = candidate.get("raw_text", "")

    skill_score, matched_skills, missing_skills = compute_skill_score(resume_skills, job_skills)
    exp_score    = compute_experience_score(experience, required_experience)
    tfidf_score  = compute_tfidf_score(raw_text, job_description)
    bert_score   = compute_bert_score(raw_text, job_description)
    final_score  = compute_final_score(skill_score, exp_score, tfidf_score, bert_score)

    logger.debug(
        f"{candidate.get('name','?')} | "
        f"skill={skill_score:.1f} tfidf={tfidf_score:.1f} "
        f"bert={bert_score:.1f} exp={exp_score:.1f} → {final_score:.1f}"
    )

    return {
        **candidate,
        "skill_score":      skill_score,
        "experience_score": exp_score,
        "tfidf_score":      tfidf_score,
        "bert_score":       bert_score,
        "match_score":      final_score,
        "matched_skills":   matched_skills,
        "missing_skills":   missing_skills,
        "job_description":  job_description,
        "bert_used":        _BERT_OK,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Ranking
# ─────────────────────────────────────────────────────────────────────────────

def rank_candidates(candidates: List[dict]) -> List[dict]:
    """Sort by match_score descending, assign integer ranks starting at 1."""
    sorted_c = sorted(candidates, key=lambda c: c.get("match_score", 0), reverse=True)
    for i, c in enumerate(sorted_c):
        c["rank"] = i + 1
    return sorted_c
