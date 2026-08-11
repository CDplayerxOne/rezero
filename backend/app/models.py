from sqlmodel import Field, SQLModel, Relationship

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    email: str = Field(unique=True, index=True)
    username: str | None = Field(default=None, index=True)
    created_at: str | None = Field(default=None, index=True)
    workspaces: list["Workspace"] = Relationship(back_populates="user")

class Workspace(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    user: User = Relationship(back_populates="workspaces")
    name: str = Field(default=None, index=True)
    created_at: str | None = Field(index=True)
    updated_at: str | None = Field(default=None, index=True)
