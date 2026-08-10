# Rezero

A starter monorepo with:

- Next.js frontend with Tailwind CSS and shadcn/ui
- Clerk authentication integration
- FastAPI backend with SQLAlchemy and Alembic
- PostgreSQL connected locally via your installed PostgreSQL server

## Install and configure PostgreSQL

Install PostgreSQL locally and create a database named `rezero`.

Then set your local connection details in [backend/.env](backend/.env) if needed:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/rezero
```

If your PostgreSQL user/password differ, update the URL accordingly.

## Start frontend

```bash
cd frontend
npm run dev
```

## Start backend

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

If the backend cannot connect to PostgreSQL, verify that:

- PostgreSQL is running locally
- the database `rezero` exists
- the credentials in [backend/.env](backend/.env) match your local server

## Configure Clerk

Set these values in frontend/.env.local:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
