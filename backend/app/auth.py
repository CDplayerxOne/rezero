from fastapi import HTTPException, Request
from clerk_backend_api import AuthenticateRequestOptions, Clerk
from .models import User
import os
from sqlmodel import Session, select
from .database import engine


clerk = Clerk(
    bearer_auth=os.getenv("CLERK_SECRET_KEY")
)

CLERK_SIGNING_SECRET = os.environ.get("CLERK_SIGNING_SECRET")


def get_current_user(request: Request) -> str:
    try:
        request_state = clerk.authenticate_request(
            request,
            AuthenticateRequestOptions(
            authorized_parties=['https://example.com']
            )
        )

        if not request_state.payload or "userId" not in request_state.payload:
            raise HTTPException(
                status_code=401,
                detail="Not authenticated"
            )

        return request_state.payload["userId"] # type: ignore

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication"
        )

# returns the user id based on the identity column in the database, which is an integer
def get_authorization_user_id(request: Request) -> int | None:
    try:
        request_state = clerk.authenticate_request(
            request,
            AuthenticateRequestOptions(
            authorized_parties=['https://example.com']
            )
        )

        if not request_state.payload or "userId" not in request_state.payload:
            raise HTTPException(
                status_code=401,
                detail="Not authenticated"
            )

        with Session(engine) as session:
            user = session.exec(select(User).where(User.clerk_id == request_state.payload["userId"])).first() 
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )
            return user.id

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication"
        )