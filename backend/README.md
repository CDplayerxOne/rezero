# Rezero Backend

FastAPI service with SQLAlchemy and Alembic.

## Run locally

```bash
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

## Migrations

```bash
alembic revision --autogenerate -m "initial"
alembic upgrade head
```
