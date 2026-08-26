from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Body
from ..services.embeddings import generate_embedding
from ..auth import get_current_user_id
from ..db.database import SessionDep
from ..db.models import Chunk, File, FileCreate, Workspace
from typing import Annotated
from sqlmodel import col, delete, desc, select
from ..config import BUCKET_NAME, s3_client 

router = APIRouter(tags=["files"])

@router.post("/files/upload/{workspace_id}", response_model=dict)
def upload_file(
    session: SessionDep,
    workspace_id: str,
    user_id: Annotated[int, Depends(get_current_user_id)],
    file: FileCreate
):  
    workspace = session.exec(select(Workspace).where(Workspace.public_id == workspace_id)).first()

    if workspace and workspace.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Upload a file to the database
    file_db = File(
        filename=file.filename,
        file_type=file.file_type,
        workspace_id=workspace.id 
    )

    session.add(file_db)
    session.commit()
    session.refresh(file_db)

    print(f"File {file_db.filename} added to database with public_id {file_db.public_id}")

    try:
        # presigned URL for uploading the file to S3
        unique_filename = f"{file_db.public_id}-{file_db.filename}"
        file_key = f"{workspace.public_id}/{unique_filename}"

        # Generate presigned URL for PUT operation
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": file_key,
                "ContentType": file_db.file_type,
            },
            ExpiresIn=3600,  # URL valid for 1 hour
        )

        print(f"Generated presigned URL for file upload: {presigned_url}")


        return {
            "url": presigned_url,
            "public_id": file_db.public_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/workspace/{workspace_id}", response_model=list[dict])
def get_files_in_workspace(
    session: SessionDep,
    workspace_id: str,
    user_id: Annotated[int, Depends(get_current_user_id)],
    page: Annotated[int, Query(ge=1)] = 1, # Ensure page is >= 1
    limit: Annotated[int, Query(le=100)] = 100, # Cap limits to protect DB
):
    workspace = session.exec(select(Workspace).where(Workspace.public_id == workspace_id)).first()
    if workspace and workspace.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this workspace")
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    offset = (page - 1) * limit
    files = session.exec(select(File).where(File.workspace_id == workspace.id).order_by(desc(File.created_at)).offset(offset).limit(limit)).all()
    try:
        urls = []
        for file in files:
            url = s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": BUCKET_NAME,
                    "Key": f"{workspace.public_id}/{file.public_id}-{file.filename}",
                },
                ExpiresIn=3600,  # 1 hour
            )
            urls.append({
                "filename": file.filename,
                "file_type": file.file_type,
                "public_id": file.public_id,
                "url": url
            })
        return urls
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/get/{file_id}", response_model=dict)
def get_file(
    session: SessionDep,
    file_id: str,
    user_id: Annotated[int, Depends(get_current_user_id)]
):
    file = session.exec(select(File).where(File.public_id == file_id)).first()
    if file:
        workspace = session.exec(select(Workspace).where(Workspace.id == file.workspace_id)).first()
        if workspace and workspace.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this file")
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Generate presigned URL for GET operation
        workspace = session.exec(select(Workspace).where(Workspace.id == file.workspace_id)).first()
        assert workspace is not None
        file_key = f"{workspace.public_id}/{file.public_id}-{file.filename}"
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": file_key,
            },
            ExpiresIn=3600,  # URL valid for 1 hour
        )
        return ({
            "filename": file.filename,
            "file_type": file.file_type,
            "public_id": file.public_id,
            "url": presigned_url
        })  # Add the presigned URL to the file object
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/delete/{file_id}", response_model=dict)
def delete_file(
    session: SessionDep,
    file_id: str,
    user_id: Annotated[int, Depends(get_current_user_id)]
):
    file = session.exec(select(File).where(File.public_id == file_id)).first()
    if file:
        workspace = session.exec(select(Workspace).where(Workspace.id == file.workspace_id)).first()
        if workspace and workspace.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Delete the file from S3
        workspace = session.exec(select(Workspace).where(Workspace.id == file.workspace_id)).first()
        assert workspace is not None
        file_key = f"{workspace.public_id}/{file.public_id}-{file.filename}"
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=file_key)

        # Delete the file from the database
        statement = delete(Chunk).where(col(Chunk.file_id) == file.id)
        session.exec(statement)
        session.delete(file)
        session.commit()

        return {"detail": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/files/embed/{file_id}", response_model=dict)
async def embed_file(
    session: SessionDep,
    file_id: str,
    user_id: Annotated[int, Depends(get_current_user_id)],
    background_tasks: BackgroundTasks,
    workspace_id: str = Body(..., embed=True)
):
    file = session.exec(select(File).where(File.public_id == file_id)).first()
    if file:
        workspace = session.exec(select(Workspace).where(Workspace.id == file.workspace_id)).first()
        if workspace and workspace.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to embed this file")

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Generate embeddings for the file
        background_tasks.add_task(generate_embedding, file, workspace_id, chunk_size=500, overlap=50)
        return {"detail": "File embedded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
