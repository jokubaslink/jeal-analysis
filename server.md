cd /var/www/4.jokubas.nomads.lt
source .venv/bin/activate
# Install backend dependencies into THIS venv
pip install -r requirements.txt
# Confirm the CLI exists
ls -la .venv/bin/alembic
.venv/bin/alembic --version
export DATABASE_URL="postgresql+psycopg2://postgres:admin@127.0.0.1:5432/jeal_db"
# Run migrations (use venv binary, not python -m)
.venv/bin/alembic upgrade head

--

cd /var/www/4.jokubas.nomads.lt
  git pull
  source .env 2>/dev/null; alembic upgrade head
  kill $(pgrep -f "uvicorn backend.app.main")
  sleep 1
  env $(grep -v '^#' .env | xargs) \
  nohup /var/www/4.jokubas.nomads.lt/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8004 > /var/log/jeal-uvicorn.log 2>&1 &