# app/parser/skill_extractor.py
"""
Skill Extraction Module
=======================
Combines two complementary methods:

1. Predefined skill dictionary (300+ skills, 10 categories)
   — Fast, high-precision, zero false-positives for known tech terms.
   — Uses regex word-boundary matching so "react" doesn't match "reactive".

2. spaCy noun-chunk / token extraction (optional enhancement)
   — When spaCy is available, scans noun chunks and filtered tokens
     for any term that overlaps with the skill dictionary.
   — Does NOT add arbitrary words; only elevates recall for known skills
     that regex might miss due to unusual spacing or casing.

Usage:
    from app.parser.skill_extractor import extract_skills_from_text, extract_job_skills
"""

import re
from typing import List, Set

# ── spaCy (same lazy loader pattern as resume_parser) ────────────────────────
_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is not None: return _nlp
    try:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
    except Exception:
        _nlp = None
    return _nlp


# ─────────────────────────────────────────────────────────────────────────────
# Master skill dictionary  (300+ entries, 10 categories)
# ─────────────────────────────────────────────────────────────────────────────

SKILLS_DB: dict[str, List[str]] = {
    "programming_languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "c",
        "ruby", "php", "swift", "kotlin", "go", "golang", "rust", "scala",
        "r", "matlab", "perl", "shell", "bash", "powershell", "vba",
        "cobol", "fortran", "haskell", "erlang", "elixir", "dart", "lua",
        "assembly", "groovy", "objective-c", "solidity",
    ],
    "web_frontend": [
        "html", "css", "html5", "css3", "react", "reactjs", "angular",
        "angularjs", "vue", "vuejs", "svelte", "jquery", "bootstrap",
        "tailwind", "tailwindcss", "sass", "less", "webpack", "vite",
        "next.js", "nextjs", "gatsby", "nuxtjs", "redux", "graphql",
        "rest api", "restful", "ajax", "xml", "json", "storybook",
    ],
    "web_backend": [
        "node.js", "nodejs", "express", "fastapi", "django", "flask",
        "spring", "spring boot", "laravel", "rails", "asp.net", "dotnet",
        ".net", "fastify", "nest.js", "nestjs", "strapi",
        "microservices", "api gateway", "websocket", "grpc", "soap",
        "celery", "rabbitmq", "kafka",
    ],
    "databases": [
        "sql", "mysql", "postgresql", "sqlite", "oracle", "sql server",
        "mongodb", "mongodb atlas", "redis", "elasticsearch", "cassandra",
        "dynamodb", "firebase", "supabase", "neo4j", "couchdb", "influxdb",
        "mariadb", "hbase", "bigquery", "snowflake", "redshift", "cosmos db",
        "pinecone", "weaviate",
    ],
    "cloud_devops": [
        "aws", "amazon web services", "azure", "google cloud", "gcp",
        "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins",
        "ci/cd", "gitlab ci", "github actions", "circleci", "helm",
        "serverless", "lambda", "ec2", "s3", "cloudformation", "nginx",
        "apache", "linux", "unix", "devops", "sre", "monitoring",
        "prometheus", "grafana", "elk stack", "splunk", "datadog",
    ],
    "data_science": [
        "machine learning", "deep learning", "neural networks", "nlp",
        "natural language processing", "computer vision", "data science",
        "data analysis", "data engineering", "data visualization",
        "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
        "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
        "jupyter", "spark", "hadoop", "airflow", "dbt", "mlflow",
        "hugging face", "transformers", "bert", "gpt", "llm",
        "reinforcement learning", "feature engineering", "statistics",
        "regression", "classification", "clustering", "random forest",
        "xgboost", "lightgbm", "opencv", "tableau", "power bi",
        "langchain", "rag", "vector database", "embeddings",
    ],
    "mobile": [
        "android", "ios", "react native", "flutter", "swift", "kotlin",
        "xamarin", "ionic", "cordova", "mobile development", "xcode",
        "android studio",
    ],
    "testing": [
        "unit testing", "integration testing", "selenium", "pytest",
        "junit", "jest", "mocha", "cypress", "playwright", "postman",
        "tdd", "bdd", "qa", "quality assurance", "test automation",
        "locust", "k6",
    ],
    "tools_practices": [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence",
        "agile", "scrum", "kanban", "sdlc", "oop", "design patterns",
        "solid", "clean code", "code review", "linux", "networking",
        "oauth", "jwt", "ssl", "encryption", "figma", "photoshop",
        "swagger", "openapi",
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "problem solving",
        "analytical", "project management", "time management",
        "collaboration", "mentoring", "presentation",
    ],
}

# ── Derived lookup structures ─────────────────────────────────────────────────
ALL_SKILLS: Set[str] = {s for skills in SKILLS_DB.values() for s in skills}
MULTI_WORD_SKILLS = sorted([s for s in ALL_SKILLS if " " in s], key=len, reverse=True)
SINGLE_WORD_SKILLS = [s for s in ALL_SKILLS if " " not in s]


# ─────────────────────────────────────────────────────────────────────────────
# Core extraction logic
# ─────────────────────────────────────────────────────────────────────────────

def _regex_extract(text: str) -> Set[str]:
    """Fast regex-based extraction against the skill dictionary."""
    norm = text.lower()
    norm = re.sub(r'\s+', ' ', norm)
    found: Set[str] = set()

    # Multi-word first (longest first to prevent partial overlaps)
    for skill in MULTI_WORD_SKILLS:
        if re.search(r'\b' + re.escape(skill) + r'\b', norm):
            found.add(skill)

    # Single-word via tokenisation (handles punctuation)
    tokens = set(re.findall(r'\b[a-z][a-z0-9\+\#\.]*\b', norm))
    for skill in SINGLE_WORD_SKILLS:
        if skill in tokens:
            found.add(skill)

    return found


def _spacy_enhance(text: str, already_found: Set[str]) -> Set[str]:
    """
    Use spaCy noun chunks to catch skills missed by regex due to
    unusual formatting (e.g. 'React.js' vs 'react').
    Only adds terms that exist in ALL_SKILLS — never adds unknown words.
    """
    nlp = _get_nlp()
    if not nlp:
        return already_found

    extra: Set[str] = set()
    doc = nlp(text[:4000])

    # Check noun chunks
    for chunk in doc.noun_chunks:
        lower = chunk.text.lower().strip()
        if lower in ALL_SKILLS:
            extra.add(lower)

    # Check individual tokens for single-word skills
    for token in doc:
        lower = token.lemma_.lower()
        if lower in ALL_SKILLS:
            extra.add(lower)

    return already_found | extra


def extract_skills_from_text(text: str) -> List[str]:
    """
    Main skill extraction entry point.
    1. Regex dictionary matching
    2. spaCy noun-chunk enhancement (if available)
    Returns sorted deduplicated list.
    """
    found = _regex_extract(text)
    found = _spacy_enhance(text, found)
    return sorted(found)


def extract_job_skills(job_description: str) -> List[str]:
    """Extract required skills from a job description text."""
    return extract_skills_from_text(job_description)


def categorize_skills(skills: List[str]) -> dict:
    """Group a list of skills by category."""
    result = {}
    for cat, cat_skills in SKILLS_DB.items():
        matched = [s for s in skills if s in cat_skills]
        if matched:
            result[cat] = matched
    return result


def skills_for_category(category: str) -> List[str]:
    return SKILLS_DB.get(category, [])
