from fastapi import Depends, APIRouter, Query, HTTPException
from ..models import Workspace, WorkspaceCreate
from ..database import SessionDep
from ..auth import get_current_user_id
from typing import Annotated
from sqlmodel import select

router = APIRouter()

@router.get("/workspaces", response_model=list[Workspace])
def get_workspaces(
    session: SessionDep, # Dependency injection for the database session
    user_id: Annotated[int, Depends(get_current_user_id)], # Dependency injection for the user ID
    offset: int = 0, # Query parameter
    limit: Annotated[int, Query(le=100)] = 100, # Query parameter with a maximum value of 100
):
    # Query the database for workspaces with pagination
    workspaces = session.exec(select(Workspace).where(Workspace.user_id == user_id).offset(offset).limit(limit)).all()
    return workspaces

@router.get("/workspaces/{workspace_id}", response_model=Workspace)
def get_workspace(
    session: SessionDep,
    workspace_id: str, # path paremeter for the workspace ID
    user_id: Annotated[int, Depends(get_current_user_id)]
):
    # Query the database for a specific workspace
    workspace = session.exec(select(Workspace).where(Workspace.public_id == workspace_id)).first()
    if workspace and workspace.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.post("/workspaces", response_model=Workspace)
def create_workspace(
    session: SessionDep,
    workspace: WorkspaceCreate,
    user_id: Annotated[int, Depends(get_current_user_id)]
):
    # Create a new workspace in the database
    print("user_id:", user_id)
    workspace_db = Workspace(
        user_id=user_id,
        name=workspace.name,
    )

    session.add(workspace_db)
    session.commit()
    session.refresh(workspace_db)
    return workspace_db

@router.delete("/workspaces/{workspace_id}", response_model=Workspace)
def delete_workspace(
    session: SessionDep,
    workspace_id: int,
    user_id: Annotated[int, Depends(get_current_user_id)]
):
    # Delete a specific workspace from the database
    workspace = session.get(Workspace, workspace_id)
    if workspace and workspace.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this workspace")
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    session.delete(workspace)
    session.commit()
    return {"ok": True, "workspace_id": workspace_id}

@router.patch("/workspaces/{workspace_id}", response_model=Workspace)
def update_workspace(  
    session: SessionDep,
    workspace_id: int,
    workspace: Workspace,
    user_id: Annotated[int, Depends(get_current_user_id)]
):
    # Update a specific workspace in the database
    db_workspace = session.get(Workspace, workspace_id)

    if db_workspace and db_workspace.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this workspace")

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