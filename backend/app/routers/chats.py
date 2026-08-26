from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ..auth import get_current_user_id
from typing import Annotated
from ..db.models import Chat, Workspace
from ..db.database import SessionDep

router = APIRouter(tags=["chats"])


# test of get_related_chunks function
@router.get("/chats/{workspace_id}", response_model=dict)
def get_related_chunks_endpoint(workspace_id: int, query: str, top_k: int = 5):
    from ..services.RAG import get_related_chunks

    chunks = get_related_chunks(query, workspace_id, top_k)
    return {"chunks": [chunk.content for chunk in chunks]}


class ChatCreateRequest(BaseModel):
    name: str


@router.post("/chats/{workspace_id}", response_model=dict)
def create_chat(
    chat_data: ChatCreateRequest,
    workspace_id: int,
    session: SessionDep,
    # user_id: Annotated[int, Depends(get_current_user_id)],
):

    workspace = session.get(Workspace, workspace_id)
    if not workspace:
        return {"error": "Workspace not found"}

    chat = Chat(workspace_id=workspace_id, name=chat_data.name)
    session.add(chat)
    session.commit()
    session.refresh(chat)

    return {"chat_id": chat.id}
