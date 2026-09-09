# RE:ZERO Backend

FastAPI service with SQLModel ORM and Alembic for migrations.

## Setup

On Windows, from the `backend` directory, create and activate a virtual environment, then install dependencies:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

On macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Create a PostgreSQL database named `rezero` with the `pgvector` extension. See the platform-specific PostgreSQL commands in the root [README.md](../README.md). Then create `.env` in this directory:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/rezero
CLERK_SECRET_KEY=sk_test_...
CLERK_SIGNING_SECRET=whsec_...
GENAI_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BUCKET_NAME=your-s3-bucket
```

Run the migrations before starting the API. On Windows:

```powershell
alembic upgrade head
```

On macOS or Linux, activate the environment first if it is not already active:

```bash
source .venv/bin/activate
alembic upgrade head
```

## Run locally

```powershell
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

On macOS or Linux:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`, with interactive documentation at `http://localhost:8000/docs` and a health check at `http://localhost:8000/health`.

## Migrations

To create a new migration after changing a model:

```powershell
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

On macOS or Linux, use the same commands after activating `.venv`:

```bash
source .venv/bin/activate
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```
