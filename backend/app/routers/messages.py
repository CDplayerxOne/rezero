from typing import Annotated
from pydantic import BaseModel
from sqlmodel import select
from ..db.database import SessionDep
from ..db.models import Workspace
from ..auth import get_current_user_id
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from ..services.RAG import handle_prompt

router = APIRouter(tags=["messages"])


class MessageRequest(BaseModel):
    chat_id: int
    prompt: str
    role: str = "user"
    context: bool = True
    workspace_id: int | None = None


@router.post("/messages", response_class=StreamingResponse)
async def handle_message(
    session: SessionDep,
    # user_id: Annotated[int, Depends(get_current_user_id)],
    message_request: MessageRequest,
):
    """
    Handle a prompt for a specific chat session and return the response as a streaming response.

    Args:
        chat_id (int): The ID of the chat session.
        prompt (str): The input prompt to handle.
        role (str): The role of the user (default is "user").
        context (bool): Whether to include context using RAG (default is True).
        workspace_id (int | None): The ID of the workspace to search within (default is None).
    Returns:
        StreamingResponse: A streaming response containing the generated response text.
    """
    try:
        # if message_request.context and not message_request.workspace_id:
        #     raise ValueError("workspace_id is required for RAG context retrieval.")

        # if message_request.workspace_id:
        #     workspace = session.exec(
        #         select(Workspace).where(
        #             Workspace.public_id == message_request.workspace_id
        #         )
        #     ).first()
        #     if workspace is None or workspace.user_id != user_id:
        #         raise ValueError(
        #             "Invalid workspace_id or user does not have access to this workspace."
        #         )

        response_generator = handle_prompt(
            message_request.prompt,
            message_request.chat_id,
            message_request.role,
            message_request.context,
            message_request.workspace_id,
        )
        return StreamingResponse(response_generator, media_type="text/plain")
    except ValueError as e:
        return StreamingResponse(iter([f"Error: {str(e)}"]), media_type="text/plain")
