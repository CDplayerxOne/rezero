from typing import Annotated
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables, SessionDep
from contextlib import asynccontextmanager
from models import Workspace, User
from sqlmodel import select

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Rezero API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/workspaces", response_model=list[Workspace])
def get_workspaces(
    session: SessionDep,
    offset: int = 0,
    limit: Annotated[int, Query(le=100)] = 100,
):
    # Query the database for workspaces with pagination
    workspaces = session.exec(select(Workspace).offset(offset).limit(limit)).all()
    return workspaces

@app.get("/workspaces/{workspace_id}", response_model=Workspace)
def get_workspace(
    session: SessionDep,
    workspace_id: int,
):
    # Query the database for a specific workspace
    workspace = session.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@app.post("/workspaces", response_model=Workspace)
def create_workspace(
    session: SessionDep,
    workspace: Workspace,
):
    # Create a new workspace in the database
    db_workspace = Workspace.model_validate(workspace)
    session.add(db_workspace)
    session.commit()
    session.refresh(db_workspace)
    return db_workspace

@app.delete("/workspaces/{workspace_id}", response_model=Workspace)
def delete_workspace(
    session: SessionDep,
    workspace_id: int,
):
    # Delete a specific workspace from the database
    workspace = session.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    session.delete(workspace)
    session.commit()
    return {"ok": True, "workspace_id": workspace_id}

@app.patch("/workspaces/{workspace_id}", response_model=Workspace)
def update_workspace(  
    session: SessionDep,
    workspace_id: int,
    workspace: Workspace,
):
    # Update a specific workspace in the database
    db_workspace = session.get(Workspace, workspace_id)
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    # converts to a dictionary 
    workspace_data = workspace.model_dump()
    for key, value in workspace_data.items():
        # updates the values of the workspace object with the new values from the request body
        setattr(db_workspace, key, value)
    session.add(db_workspace)
    session.commit()
    session.refresh(db_workspace)
    return db_workspace



@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

