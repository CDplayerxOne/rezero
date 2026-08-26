from ..db.models import Chunk, File
from ..db.database import engine
from sqlmodel import Session
from ..config import client 
from google.genai import types
from ..config import s3_client, BUCKET_NAME
from .document_processor import extract_text_from_pdf

def create_embedding(content: str) -> list[float] | None:
    """
    Create an embedding for the given content using the Gemini Embeddings model.

    Args:
        content (str): The text content to generate an embedding for.

    Returns:
        list[float]: The embedding values, or None if no embeddings are returned.
    """
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=content,
        config=types.EmbedContentConfig(
            output_dimensionality=768
        )
    )
    return response.embeddings[0].values if response.embeddings and len(response.embeddings) > 0 else None

def generate_embedding(file: File, workspace_id: str, chunk_size: int, overlap: int) -> None:
    """
    Generate embeddings for a list of texts using the Gemini Embeddings model.

    Args:
        file (File): The file to generate embeddings for.
        workspace_id (str): The public ID of the workspace the file belongs to.
        chunk_size (int): The size of each text chunk.
        overlap (int): The amount of overlap between consecutive chunks.

    Returns:
        None
    """
    try:
        file_object = s3_client.get_object(Bucket=BUCKET_NAME, Key=f"{workspace_id}/{file.public_id}-{file.filename}")
        file_content = file_object['Body'].read()
        texts = extract_text_from_pdf(file_content)

        for page_number, text in texts.items():
            for i in range(0, len(text), chunk_size - overlap):
                chunk = text[i:i + chunk_size]
                embedding = create_embedding(chunk)
            
                if embedding is not None:
                    chunk_db = Chunk(
                        file_id=file.id,
                        workspace_id=file.workspace_id,
                        content=chunk,
                        page_number=page_number,
                        embedding=embedding
                    )
                    with Session(engine) as session:
                        session.add(chunk_db)
                        session.commit()
                        session.refresh(chunk_db)
                else:
                    raise ValueError("No embeddings returned from the API for the given chunk.")
        print(f"Successfully generated embeddings for file {workspace_id}/{file.public_id}-{file.filename}")
    except Exception as e:
        print(f"Error generating embeddings for file {file.filename}: {e}")
    