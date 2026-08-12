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
    name: str = Field(default=None, index=True)
    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat(), index=True)
    updated_at: str | None = Field(default_factory=lambda: datetime.now().isoformat(), index=True)
    user: User = Relationship(back_populates="workspaces")
