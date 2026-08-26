from fastapi import APIRouter, HTTPException, Request, status
from svix.webhooks import Webhook, WebhookVerificationError

from ..config import CLERK_SIGNING_SECRET, clerk
from ..db.database import SessionDep
from ..db.models import User

router = APIRouter(tags=["users"])

@router.post("/users", response_model=User)
async def create_user(
    session: SessionDep,
    request: Request,
):
    if not CLERK_SIGNING_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signing secret missing from server environment variables."
        )

    # Extract the required Svix headers
    headers = request.headers
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    # Reject if headers are missing
    if not all([svix_id, svix_timestamp, svix_signature]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required Svix cryptographic headers."
        )

    # Get the raw text payload from the request body
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    # Verify the webhook signature using Svix's Webhook class
    try:
        wh = Webhook(CLERK_SIGNING_SECRET)
        # Returns the parsed payload as a dictionary if successful
        payload = wh.verify(body_str, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature
        }) # type: ignore
    except WebhookVerificationError as e:
        print(f"Verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature payload."
        )

    # Extract data and process the event type
    event_type = payload.get("type")
    event_data = payload.get("data", {})

    if event_type == "user.created":
        clerk_id = event_data.get("id")
        # gets primary email address from the event data, if it exists, and falls back to the first email address in the list if not
        primary_email_id = event_data.get("primary_email_address_id")
        email_addresses = event_data.get("email_addresses") or []
        email = None

        for email_address in email_addresses:
            if email_address.get("id") == primary_email_id:
                email = email_address.get("email_address")
                break

        if email is None and email_addresses:
            email = email_addresses[0].get("email_address")

        username = event_data.get("username")

        if not isinstance(email, str) or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Clerk webhook payload did not include a valid email address.",
            )

         # Create a new user in the database
        try:
            user_db = User(
                clerk_id=clerk_id,
                email=email,
                username=username,
            )

            session.add(user_db)
            session.commit()
            session.refresh(user_db)
            return user_db
        except Exception as e:
            print(f"Error creating user: {e}. Deleting user from Clerk")
            try:
                # Delete the user from Clerk if database insertion fails
                clerk.users.delete(user_id=clerk_id)
            except Exception as delete_error:
                print(f"Error deleting user from Clerk: {delete_error}")
                
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error creating user."
            )

