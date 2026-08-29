from .embeddings import create_embedding
from ..db.models import Chat, Chunk, Message
from ..db.database import engine
from sqlmodel import Session, desc, select
from ..config import client


def get_related_chunks(query: str, workspace_id: int, top_k: int = 5) -> list[Chunk]:
    """
    Retrieve the most relevant chunks based on the query embedding.

    Args:
        query (str): The query string.
        workspace_id (int): The public ID of the workspace to search within.
        top_k (int): The number of top relevant chunks to retrieve.

    Returns:
        list[Chunk]: A list of the most relevant chunks.
    """
    try:
        with Session(engine) as session:
            query_embedding = create_embedding(query)
            # Query the database for chunks in the specified workspace
            chunks = session.exec(select(Chunk).where(Chunk.workspace_id == workspace_id).order_by(Chunk.embedding.cosine_distance(query_embedding)).limit(top_k)).all()  # type: ignore

            return [chunk for chunk in chunks]
    except Exception as e:
        print(f"Error retrieving related chunks: {e}")
        return []


def generate_chat_title(prompt: str, chat_id: int) -> None:
    """
    Generate a chat title based on the provided prompt using the Gemini API.

    Args:
        prompt (str): The input prompt to generate a title for.
        chat_id (int): The ID of the chat session.

    Returns:
        None
    """
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=f"Generate a concise (maximum 5 words) and relevant title for the following prompt: {prompt}",
        )
        if not response.text:
            raise ValueError("No title generated from the API.")
        with Session(engine) as session:
            chat_title = response.text.strip()
            chat = session.get(Chat, chat_id)
            if chat:
                chat.name = chat_title
                session.commit()
                session.refresh(chat)
            else:
                raise ValueError(f"Chat with ID {chat_id} not found.")
        print(f"Generated chat title: {response.text}")
    except Exception as e:
        print(f"Error generating chat title: {e}")


async def gemini_response(prompt: str):
    """
    Generate a response from the Gemini API based on the provided prompt.

    Args:
        prompt (str): The input prompt for the Gemini API.

    Returns:
        str: The generated response from the Gemini API.
    """
    try:
        response = await client.aio.models.generate_content_stream(
            model="gemini-3.6-flash", contents=prompt
        )
        async for chunk in response:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        print(f"Error generating response from Gemini API: {e}")
        yield "An error occurred while generating the response."


async def handle_prompt(
    prompt: str,
    chat_id: int,
    role: str = "user",
    context: bool = False,
    workspace_id: int | None = None,
):
    """
    Handle the provided prompt by generating a response from the Gemini API and storing the user and assistant messages in the database.

    Args:
        prompt (str): The input prompt to handle.
        chat_id (int): The ID of the chat session.
        role (str): The role of the user (default is "user").
        context (bool): Whether to include context using RAG (default is False).
        workspace_id (int | None): The ID of the workspace to search within (default is None).
    """
    try:
        user_message = Message(
            chat_id=chat_id,
            role=role,
            content=prompt,
        )

        context_text = ""

        # Retrieve the last 5 messages from the chat for context
        with Session(engine) as session:
            last_messages = session.exec(
                select(Message)
                .where(Message.chat_id == chat_id)
                .order_by(desc(Message.created_at))
                .limit(5)
            ).all()
            last_messages_text = "\n".join(
                [f"{msg.role}: {msg.content}" for msg in reversed(last_messages)]
            )
            if last_messages_text:
                context_text += "Last messages:\n"
                context_text += last_messages_text
        if context:
            if workspace_id:
                # Retrieve related chunks based on the prompt and workspace_id
                related_chunks = get_related_chunks(prompt, workspace_id)
                related_chunks_text = "\n".join(
                    [
                        f"Chunk {i}: {chunk.content}"
                        for i, chunk in enumerate(related_chunks)
                    ]
                )
                if len(context_text) > 0:
                    context_text += "Related chunks:\n"
                    context_text += related_chunks_text

        if context_text:
            prompt += "\nContext:\n"
            prompt += context_text

        response = ""
        async for response_text in gemini_response(prompt):
            response += response_text
            yield response_text

        response_message = Message(
            chat_id=chat_id,
            role="assistant",
            content=response,
        )
        with Session(engine) as session:
            session.add_all([user_message, response_message])
            session.commit()
            session.refresh(user_message)
            session.refresh(response_message)
    except Exception as e:
        print(f"Error handling prompt: {e}")
