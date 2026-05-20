# Run locally

## Terminal 1 — API

```bash
cd /Users/jokubas/Desktop/Programavimas/jeal_analysis
source .venv/bin/activate
export DATABASE_URL="postgresql+psycopg2://postgres:admin@127.0.0.1:5432/jeal_db"
python -m alembic upgrade head
python -m uvicorn backend.app.main:app --reload
```

## Terminal 2 — frontend

```bash
cd /Users/jokubas/Desktop/Programavimas/jeal_analysis/frontend
npm run dev
```

## Exit venv (after stopping uvicorn)

```bash
deactivate
```
