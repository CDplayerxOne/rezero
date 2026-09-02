from fastapi import APIRouter, BackgroundTasks, Body, Depends
from pydantic import BaseModel

from ..services.RAG import generate_chat_title
from ..auth import get_current_user_id
from typing import Annotated
from ..db.models import Chat, Workspace
from ..db.database import SessionDep
from sqlmodel import select

router = APIRouter(tags=["chats"])


# test of get_related_chunks function
@router.get("/chats/{workspace_id}/test", response_model=dict)
def get_related_chunks_endpoint(workspace_id: int, query: str, top_k: int = 5):
    from ..services.RAG import get_related_chunks

    chunks = get_related_chunks(query, workspace_id, top_k)
    return {"chunks": [chunk.content for chunk in chunks]}


@router.get("/chats/{workspace_id}", response_model=dict)
def get_chats(
    workspace_id: int,
    session: SessionDep,
    user_id: Annotated[int, Depends(get_current_user_id)],
):
    try:
        workspace = session.exec(
            select(Workspace).where(Workspace.id == workspace_id)
        ).first()

        if not workspace:
            return {"error": "Workspace not found"}

        if workspace.user_id != user_id:
            return {
                "error": "You do not have permission to view chats in this workspace"
            }

        chats = session.exec(
            select(Chat).where(Chat.workspace_id == workspace_id)
        ).all()

        return {"chats": [{"id": chat.public_id, "name": chat.name} for chat in chats]}
    except Exception as e:
        return {"error": str(e)}


class ChatCreateRequest(BaseModel):
    name: str


@router.post("/chats/{workspace_id}", response_model=dict)
async def create_chat(
    chat_data: ChatCreateRequest,
    workspace_id: int,
    session: SessionDep,
    user_id: Annotated[int, Depends(get_current_user_id)],
    background_tasks: BackgroundTasks,
    prompt: str = Body(),
):
    try:
        workspace = session.exec(
            select(Workspace).where(Workspace.id == workspace_id)
        ).first()

        if not workspace:
            return {"error": "Workspace not found"}

        if workspace.user_id != user_id:
            return {
                "error": "You do not have permission to create a chat in this workspace"
            }

        chat = Chat(workspace_id=workspace_id, name=chat_data.name)
        session.add(chat)
        session.commit()
        session.refresh(chat)
        if chat.id is None:
            return {"error": "Failed to create chat"}
        background_tasks.add_task(generate_chat_title, prompt, chat.id)

        return {
            "chat_id": chat.id,
            "name": chat.name,
            "workspace_id": chat.workspace_id,
        }
    except Exception as e:
        return {"error": str(e)}
