from fastapi import HTTPException, Request
from clerk_backend_api import AuthenticateRequestOptions
from .models import User
from sqlmodel import Session, select
from .database import engine
from .config import clerk 

def get_current_user_clerk(request: Request) -> str:
    try:
        request_state = clerk.authenticate_request(
            request,
            AuthenticateRequestOptions(
            authorized_parties=['http://localhost:3000']
            )
        )

        if not request_state.payload or "sub" not in request_state.payload:
            raise HTTPException(
                status_code=401,
                detail="Not authenticated"
            )

        return request_state.payload["sub"] # type: ignore

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication"
        )

# returns the user id based on the identity column in the database, which is an integer
def get_current_user_id(request: Request) -> int | None:
    try:
        request_state = clerk.authenticate_request(
            request,
            AuthenticateRequestOptions(
            authorized_parties=['http://localhost:3000']
            )
        )
        print("Request state:", request_state)

        if not request_state.payload or "sub" not in request_state.payload:
            print("No userId found in request payload")
            raise HTTPException(
                status_code=401,
                detail="Not authenticated"
            )

        with Session(engine) as session:
            user = session.exec(select(User).where(User.clerk_id == request_state.payload["sub"])).first() 
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )
            return user.id

    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication"
        )