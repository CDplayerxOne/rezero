from typing import Annotated
from uuid import UUID
from pydantic import BaseModel
from sqlmodel import desc, select
from ..db.database import SessionDep
from ..db.models import Chat, Workspace, Message
from ..auth import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from ..services.RAG import handle_prompt

router = APIRouter(tags=["messages"])


@router.get("/messages", response_model=dict)
def get_messages(
    session: SessionDep,
    user_id: Annotated[int, Depends(get_current_user_id)],
    chat_id: UUID,
    workspace_id: UUID,
    before: UUID | None = None,
    limit: int = Query(default=50, le=100),
):
    """
    Retrieve most recent messages for a specific chat session.

    Args:
        session (SessionDep): The database session.
        user_id (int): The ID of the current user.
        chat_id (UUID): The ID of the chat.
        workspace_id (UUID): The ID of the workspace.
        before (str): The timestamp of the last message to include.
        limit (int): The maximum number of messages to retrieve.

    Returns:
        dict: A dictionary containing the retrieved messages, a flag indicating if there are more messages,
        and the ID of the last message.
    """
    chat = session.exec(
        select(Chat)
        .join(Workspace)
        .where(Chat.public_id == chat_id, Workspace.public_id == workspace_id)
    ).first()
    if chat is None or chat.id is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    workspace = session.exec(
        select(Workspace).where(
            Workspace.public_id == workspace_id,
            Workspace.user_id == user_id,
        )
    ).first()
    if workspace is None:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = (
        select(Message)
        .where(Message.chat_id == chat.id)
        .order_by(desc(Message.created_at))
        .limit(limit + 1)
    )

    if before is not None:
        before_message = session.exec(
            select(Message).where(
                Message.public_id == before,
                Message.chat_id == chat.id,
            )
        ).first()
        if before_message is not None:
            query = query.where(Message.created_at < before_message.created_at)

    messages = session.exec(query).all()
    return {
        "messages": [
            {
                "id": str(message.public_id),
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at,
            }
            for message in messages[:limit]
        ],
        "has_more": len(messages) > limit,
        "last_message_id": (
            str(messages[limit - 1].public_id)
            if len(messages) >= limit
            else str(messages[-1].public_id) if messages else None
        ),
    }


class MessageRequest(BaseModel):
    chat_id: str
    prompt: str
    role: str = "user"
    context: bool = True
    workspace_id: str


@router.post("/messages", response_class=StreamingResponse)
async def handle_message(
    session: SessionDep,
    user_id: Annotated[int, Depends(get_current_user_id)],
    message_request: MessageRequest,
):
    """
    Handle a prompt for a specific chat session and return the response as a streaming response.

    Args:
        session (SessionDep): The database session.
        user_id (int): The ID of the current user.
        message_request (MessageRequest): The request containing the message details.

    Returns:
        StreamingResponse: A streaming response containing the generated response text.
    """
    try:

        workspace = session.exec(
            select(Workspace).where(Workspace.public_id == message_request.workspace_id)
        ).first()
        if workspace is None or workspace.user_id != user_id:
            raise ValueError(
                "Invalid workspace_id or user does not have access to this workspace."
            )
        chat = session.exec(
            select(Chat).where(Chat.public_id == message_request.chat_id)
        ).first()

        if chat is None or chat.id is None:
            raise ValueError(f"Chat with ID {message_request.chat_id} not found.")

        response_generator = handle_prompt(
            message_request.prompt,
            chat.id,
            message_request.role,
            message_request.context,
            workspace.id,
        )
        return StreamingResponse(response_generator, media_type="text/event-stream")
    except ValueError as e:
        return StreamingResponse(
            iter([f"event: error\ndata: Error: {str(e)}"]),
            media_type="text/event-stream",
        )
