from datetime import datetime
import uuid
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Index
from sqlmodel import Field, Index, SQLModel, Relationship


class UserBase(SQLModel):
    email: str
    username: str | None = None
    created_at: str | None = None


class UserCreate(UserBase):
    pass


class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    clerk_id: str | None = Field(default=None, index=True)
    email: str = Field(unique=True, index=True)
    username: str | None = Field(default=None, index=True)
    created_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    workspaces: list["Workspace"] = Relationship(back_populates="user")


class WorkspaceBase(SQLModel):
    name: str


class WorkspaceCreate(WorkspaceBase):
    pass


class Workspace(WorkspaceBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    public_id: uuid.UUID | None = Field(
        default_factory=uuid.uuid4, unique=True, index=True
    )
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str = Field(index=True)
    created_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    updated_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    user: User = Relationship(back_populates="workspaces")
    files: list["File"] = Relationship(back_populates="workspace")
    chunks: list["Chunk"] = Relationship(back_populates="workspace")
    chats: list["Chat"] = Relationship(back_populates="workspace")


class FileBase(SQLModel):
    filename: str
    file_type: str


class FileCreate(FileBase):
    pass


class File(FileBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    public_id: uuid.UUID | None = Field(
        default_factory=uuid.uuid4, unique=True, index=True
    )
    workspace_id: int | None = Field(
        default=None, foreign_key="workspace.id", index=True
    )
    filename: str = Field(index=True)
    file_type: str = Field(index=True)
    created_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    updated_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    workspace: Workspace = Relationship(back_populates="files")
    chunks: list["Chunk"] = Relationship(back_populates="file")


class Chunk(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    file_id: int | None = Field(default=None, foreign_key="file.id", index=True)
    workspace_id: int | None = Field(
        default=None, foreign_key="workspace.id", index=True
    )
    content: str
    page_number: int
    embedding: list[float] = Field(sa_column=Column(Vector(768)))
    created_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    file: File = Relationship(back_populates="chunks")
    workspace: Workspace = Relationship(back_populates="chunks")
    __table_args__ = (
        Index(
            "hnsw_idx_on_embeddings",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class ChatBase(SQLModel):
    workspace_id: int
    name: str
    created_at: str | None


class ChatCreate(ChatBase):
    pass


class Chat(ChatBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    workspace_id: int = Field(foreign_key="workspace.id", index=True)
    name: str = Field(index=True)
    created_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    updated_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    workspace: Workspace = Relationship(back_populates="chats")
    messages: list["Message"] = Relationship(back_populates="chat")


class MessageBase(SQLModel):
    chat_id: int
    role: str
    content: str


class MessageCreate(MessageBase):
    pass


class Message(MessageBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    chat_id: int = Field(foreign_key="chat.id", index=True)
    role: str = Field(index=True)
    content: str
    created_at: str | None = Field(
        default_factory=lambda: datetime.now().isoformat(), index=True
    )
    chat: Chat = Relationship(back_populates="messages")
