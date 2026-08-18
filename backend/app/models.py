from datetime import datetime
import uuid

from sqlmodel import Field, SQLModel, Relationship


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
    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat(), index=True)
    workspaces: list["Workspace"] = Relationship(back_populates="user")


class WorkspaceBase(SQLModel):
    name: str

class WorkspaceCreate(WorkspaceBase):
    pass


class Workspace(WorkspaceBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    public_id: uuid.UUID | None = Field(default_factory=uuid.uuid4, unique=True, index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str  = Field(index=True)
    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat(), index=True)
    updated_at: str | None = Field(default_factory=lambda: datetime.now().isoformat(), index=True)
    user: User = Relationship(back_populates="workspaces")
    files: list["File"] = Relationship(back_populates="workspace")

class FileBase(SQLModel):
    filename: str
    file_type: str

class FileCreate(FileBase):
    pass

class File(FileBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    public_id: uuid.UUID | None = Field(default_factory=uuid.uuid4, unique=True, index=True)
    workspace_id: int | None = Field(default=None, foreign_key="workspace.id", index=True)
    filename: str  = Field(index=True)
    file_type: str  = Field(index=True)
    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat(), index=True)
    updated_at: str | None = Field(default_factory=lambda: datetime.now().isoformat(), index=True)
    workspace: Workspace = Relationship(back_populates="files")
