import os
import boto3
from clerk_backend_api import Clerk
from google import genai

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET_NAME = os.getenv("BUCKET_NAME", "my-app-bucket")
CLERK_SIGNING_SECRET = os.environ.get("CLERK_SIGNING_SECRET")

s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
)


clerk = Clerk(
    bearer_auth=os.getenv("CLERK_SECRET_KEY")
)

client = genai.Client(api_key=os.getenv("GENAI_API_KEY"))
