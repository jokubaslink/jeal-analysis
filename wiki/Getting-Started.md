# 🚀 Getting Started

## Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Python | 3.10 | `python --version` |
| Node.js | 18 | `node --version` |
| PostgreSQL | 14 | `psql --version` |
| pip | any | `pip --version` |
| npm | any | `npm --version` |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/jokubaslink/jeal-analysis.git
cd jeal-analysis
```

### 2. Create a PostgreSQL database

```sql
CREATE DATABASE jeal_db;
```

### 3. Set up the backend

```bash
# Create a virtual environment
python -m venv .venv

# Activate it
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows PowerShell

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Configure the database connection

```bash
# macOS / Linux
export DATABASE_URL="postgresql+psycopg2://postgres:admin@127.0.0.1:5432/jeal_db"

# Windows PowerShell
$env:DATABASE_URL = "postgresql+psycopg2://postgres:admin@127.0.0.1:5432/jeal_db"
```

> **Default:** If `DATABASE_URL` is not set, the app falls back to `postgresql+psycopg2://postgres:admin@127.0.0.1:5432/jeal_db`.

### 5. Run database migrations + seed data

```bash
python -m alembic upgrade head
```

This creates all tables and populates them with:
- Interest categories and interests (sports, arts, STEM, social, …)
- Sample Lithuanian university clubs and real 2026 event listings
- A built-in admin account

### 6. Start the backend API

```bash
python -m uvicorn backend.app.main:app --reload
```

The API is now available at **http://127.0.0.1:8000**
Interactive docs (Swagger UI): **http://127.0.0.1:8000/docs**

### 7. Set up and start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app is now available at **http://localhost:5173**

---

## Default accounts

### Admin account

| Field | Value |
|-------|-------|
| Email | `admin@admin.com` |
| Password | `Admin123!` |

Log in with these credentials to access the `/admin` panel.

> ⚠️ Change or remove this account before deploying to any shared environment.

---

## Project structure

```
jeal-analysis/
├── backend/
│   └── app/
│       ├── main.py          ← All API endpoints + business logic
│       ├── models.py        ← SQLAlchemy ORM models
│       └── database.py      ← DB session + engine setup
├── frontend/
│   └── src/
│       ├── pages/           ← One file per screen
│       ├── components/ui/   ← Shared Button, Card, Input, etc.
│       ├── auth/            ← AuthContext (login state)
│       ├── api/             ← apiFetch wrapper
│       └── lib/             ← Club membership + saved items helpers
├── alembic/
│   └── versions/            ← Migration + seed scripts
├── docs/
│   ├── DESIGN_SYSTEM.md     ← Visual design spec
│   └── PLAN_QR_ATTENDANCE_TRACKING.md
└── requirements.txt
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `503 Service Unavailable` from API | PostgreSQL is not running, or `DATABASE_URL` is wrong |
| `Cannot connect to database` during migrations | Check that port 5432 is open and credentials match |
| Frontend shows blank page | Make sure the API is running at port 8000 and CORS origins include `localhost:5173` |
| `alembic: command not found` | Use `python -m alembic` instead |
