# 🧠 ResumeAI — Intelligent Resume Screening & Ranking System

A **production-ready full-stack AI app** that automatically parses, matches, ranks resumes against a job description — built with FastAPI + React + TailwindCSS.

---

## 📸 Features

| Feature | Status |
|---|---|
| Multi-file resume upload (PDF, DOCX, TXT) | ✅ |
| Resume text extraction & parsing | ✅ |
| Skill extraction (300+ skills library) | ✅ |
| Keyword + TF-IDF cosine similarity matching | ✅ |
| Candidate ranking with weighted scores | ✅ |
| Dark glassmorphism dashboard UI | ✅ |
| Score breakdown charts (radar, bar) | ✅ |
| Resume preview with keyword highlighting | ✅ |
| Filters (score, skill, experience, name) | ✅ |
| Export CSV / PDF report | ✅ |
| SQLite (default) + MongoDB Atlas support | ✅ |
| REST API with Swagger docs | ✅ |

---

## 🗂 Project Structure

```
resume_screener/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings from .env
│   │   ├── routes/api.py        # All REST endpoints
│   │   ├── parser/
│   │   │   ├── resume_parser.py # PDF/DOCX/TXT extraction
│   │   │   └── skill_extractor.py # 300+ skill matching
│   │   ├── services/
│   │   │   ├── matcher.py       # Scoring algorithms
│   │   │   ├── candidate_service.py # DB CRUD
│   │   │   └── export_service.py # CSV/PDF generation
│   │   ├── models/schemas.py    # Pydantic models
│   │   └── database/db.py       # SQLite + MongoDB
│   ├── requirements.txt
│   └── .env                     # ← Edit this
│
└── frontend/
    ├── src/
    │   ├── components/           # Reusable UI components
    │   ├── pages/                # Route pages
    │   ├── services/api.js       # Axios API calls
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

## ⚡ Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --port 8000
```

→ API running at **http://localhost:8000**  
→ Swagger UI at **http://localhost:8000/docs**

---

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

→ App running at **http://localhost:5173**

---

## 🔧 Environment Configuration (`.env`)

The `.env` file is in `backend/`. Default settings work out-of-the-box with SQLite.

```env
# Use SQLite (default — no setup needed)
DB_TYPE=sqlite
SQLITE_DB_PATH=./resume_screener.db

# CORS — update if your frontend runs on a different port
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 🍃 Optional: Switch to MongoDB Atlas

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a **free M0 cluster**
2. Click **Connect → Drivers → Python** and copy the connection string
3. Update `.env`:

```env
DB_TYPE=mongodb
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/resume_screener?retryWrites=true&w=majority
MONGODB_DB_NAME=resume_screener
```

4. Whitelist your IP in MongoDB Atlas → **Network Access → Add IP Address → Allow from anywhere (0.0.0.0/0)**

---

## 🌐 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/upload-resume` | Upload + parse a single resume |
| `POST` | `/api/v1/upload-resumes` | Upload multiple resumes |
| `POST` | `/api/v1/analyze` | Run AI matching against job description |
| `GET` | `/api/v1/results` | Get ranked results (with filters) |
| `GET` | `/api/v1/candidate/{id}` | Get single candidate detail |
| `DELETE` | `/api/v1/candidate/{id}` | Delete a candidate |
| `GET` | `/api/v1/export/csv` | Download results as CSV |
| `GET` | `/api/v1/export/pdf` | Download results as PDF |
| `GET` | `/api/v1/stats` | Dashboard statistics |
| `POST` | `/api/v1/clear` | Clear all candidates |

---

## 🧪 Example cURL Commands

```bash
# Upload a resume
curl -X POST http://localhost:8000/api/v1/upload-resume \
  -F "file=@/path/to/resume.pdf"

# Run analysis
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "job_description": "Looking for Python developer with SQL and machine learning skills",
    "min_experience": 2
  }'

# Get results with filters
curl "http://localhost:8000/api/v1/results?min_score=50&skill=python"

# Get specific candidate
curl http://localhost:8000/api/v1/candidate/<id>

# Export CSV
curl -O -J http://localhost:8000/api/v1/export/csv
```

---

## 🤖 NLP & Scoring Algorithms

### Three algorithms — all genuinely implemented

| Algorithm | Library | What it does |
|---|---|---|
| **Keyword Matching** | Built-in regex + 300-skill dictionary | Exact skill intersection, word-boundary safe |
| **TF-IDF Cosine Similarity** | `sklearn.TfidfVectorizer` | Vectorises full resume vs JD, bigram-aware cosine sim |
| **BERT Semantic Matching** | `sentence-transformers` (`all-MiniLM-L6-v2`) | 384-dim embeddings, semantic cosine similarity |

### spaCy NER pipeline

Used in `resume_parser.py` for:
- **PERSON** entities → candidate name extraction  
- **ORG** entities → employer/university names  
- **DATE** entities → experience year calculation  

Model: `en_core_web_sm` (install with `python -m spacy download en_core_web_sm`)

### Final weighted score

```
With BERT available:
  base = skill × 0.50 + tfidf × 0.25 + bert × 0.25

Without BERT (fallback):
  base = skill × 0.55 + tfidf × 0.45

final_score = base × 0.80 + experience_score × 0.20
```

All four component scores are stored and displayed in the dashboard.

---

## 📦 Datasets (Optional — Not Required)

The system works with any resume files you upload. However, for testing with sample resumes:

| Dataset | Link | Use |
|---|---|---|
| Resume Dataset (2400+ resumes) | [Kaggle: gauravduttakiit/resume-dataset](https://www.kaggle.com/datasets/gauravduttakiit/resume-dataset) | Test bulk upload |
| Resume entities for NER | [Kaggle: dataturks/resume-entities-for-ner](https://www.kaggle.com/datasets/dataturks/resume-entities-for-ner) | Test NLP parsing |
| Job descriptions dataset | [Kaggle: promptcloud/jobs-on-naukricom](https://www.kaggle.com/datasets/promptcloud/jobs-on-naukricom) | Test job description parsing |
| Indeed Job Postings | [Kaggle: promptcloud/us-jobs-on-monstercom](https://www.kaggle.com/datasets/promptcloud/us-jobs-on-monstercom) | Job description templates |

> **Note:** These datasets are optional. The system fully works without them — just upload your own PDF/DOCX resumes.

---

## 🛠 Troubleshooting

**`ModuleNotFoundError: pdfplumber`**  
→ Run `pip install -r requirements.txt` inside your activated virtualenv.

**CORS error in browser**  
→ Ensure `ALLOWED_ORIGINS` in `.env` includes your frontend URL exactly (e.g., `http://localhost:5173`).

**`Error: no such table: candidates`**  
→ The SQLite DB auto-creates on first run. Make sure `uvicorn` started successfully.

**PDF text extraction returns empty**  
→ Some PDFs are image-based (scanned). The system will raise a clear error. Convert to text-based PDF first.

**MongoDB connection fails**  
→ The system auto-falls back to SQLite. Check your URI format and IP whitelist in Atlas.

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Uvicorn, SQLAlchemy |
| Parsing | pdfplumber, PyPDF2, python-docx |
| ML/NLP | spaCy NER (`en_core_web_sm`), sklearn TF-IDF, sentence-transformers BERT |
| Database | SQLite (default), MongoDB Atlas (optional) |
| Frontend | React 18, Vite, TailwindCSS |
| Charts | Recharts |
| Animation | Framer Motion |
| HTTP | Axios |
