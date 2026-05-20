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