from fastapi import FastAPI  
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables 
from contextlib import asynccontextmanager
from .routers import users, workspaces, files

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="Rezero API", version="0.1.0", lifespan=lifespan)

app.include_router(users.router, tags=["users"])
app.include_router(workspaces.router,  tags=["workspaces"])
app.include_router(files.router, tags=["files"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

