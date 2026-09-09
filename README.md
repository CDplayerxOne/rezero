# RE:ZERO

A lightweight, workspace-based AI Interface, RE:ZERO sits in between a chatbot (think ChatGPT, Gemini) and a full-fledged research tool (think Gemini Notebook).

## Features

- Standard chat interface
- Files tab to keep all workspace files in one place
- RAG pipeline that pulls relevant context from uploaded files
- Clips: Stored, editable chat messages for quick reference
- Notes: Follow-up conversations opened in a sidebar that links to text from chat messages

## Architecture

Below are some key architectural decisions and implementations.

- **User Creation**: Authentication is implemented using Clerk. However, we store additional user data in our database that needs to be synced up with Clerk. In particular, we need to know when a user is created. So we decided to set up a webhook in clerk that calls an endpoint in our API which then stores the user data in our PostgreSQL database.

- **File Uploads**: Files are uploaded to S3 from the frontend via Presigned URLs. Upon completion of the upload, the frontend notifies the backend. In the background, the backend then retrieves the files, chunks them and uses the Gemini API to generate embeddings for each chunk and store the embedding and metadata accordingly with PostgresQL and pgvector. All of this is done in the background via FastAPI background tasks.

- **RAG**: When a user sends a message, the message is converted to an embedding, after which we use cosine distance to find the 5 most related chunks. These chunks are attached, in a addition to the last 5 messages in the chat, to the prompt before being sent to a Gemini 3.6 flash model via the Gemini API.

- **Chat Creation**: A new chat is created by sending a prompt in the new chat tab. After the backend completes the creation of a new chat, it sends back the chat ID after which the page redirects to the chat's dedicated page with the prompt attached in the URL. The prompt is then sent again to the backend and the prompt is removed from the URL.

- **State Management**: State is managed using Tanstack-Query so that refetches are only made when data changes.

- **Response Streaming**: When the message is sent, the response is streamed back to the frontend using server sent events. As the data arrives, we update the query cache. When displayed, we complete the markdown closing brackets if the markdown is only partially complete. Once the response stream is complete, we fetch the clean markdown.

## Prerequisites

Install the following before starting the application:

- Python 3.11 or newer
- Node.js 20 or newer and npm
- PostgreSQL with the `pgvector` extension
- An AWS S3 bucket
- A Clerk application
- A Google Gemini API key

## Setup

Choose the instructions for your operating system. The environment variable names and application commands are the same on every platform.

### 1. Install dependencies

#### Windows

Create the backend virtual environment and install its dependencies:

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Install the frontend dependencies in a second terminal:

```powershell
cd frontend
npm install
```

#### macOS and Linux

From the repository root, create the backend virtual environment and install its dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Install the frontend dependencies in a second terminal:

```bash
cd frontend
npm install
```

### 2. Configure PostgreSQL and backend services

Create a PostgreSQL database named `rezero` and enable `pgvector`.

On macOS with Homebrew:

```bash
brew install postgresql@16 pgvector
brew services start postgresql@16
createdb rezero
psql rezero -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

On Debian or Ubuntu Linux, install PostgreSQL and the pgvector package matching your PostgreSQL version:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib postgresql-16-pgvector
sudo systemctl enable --now postgresql
sudo -u postgres createdb rezero
sudo -u postgres psql rezero -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

If your distribution uses a different PostgreSQL version, replace `postgresql-16-pgvector` with the matching package name. The SQL commands can also be run from `psql` on Windows:

```sql
CREATE DATABASE rezero;
\c rezero
CREATE EXTENSION IF NOT EXISTS vector;
```

Create [backend/.env](backend/.env) with your local database and service credentials:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/rezero
CLERK_SECRET_KEY=sk_test_...
CLERK_SIGNING_SECRET=whsec_...
GENAI_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BUCKET_NAME=your-s3-bucket
```

Update `DATABASE_URL` and the service credentials for your environment. The AWS variables use the standard names recognized by boto3.

Apply the existing database migrations:

On Windows:

```powershell
cd backend
.venv\Scripts\Activate.ps1
alembic upgrade head
```

On macOS or Linux:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

### 3. Configure the frontend

Create [frontend/.env.local](frontend/.env.local):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Use the Clerk keys from the same Clerk application. Configure a Clerk webhook to call the backend user webhook endpoint if user synchronization is enabled.

## Run locally

Start the backend in one terminal on Windows:

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

On macOS or Linux:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Start the frontend in a second terminal on any platform:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend API and interactive documentation are available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Troubleshooting

If the backend cannot connect to PostgreSQL, verify that PostgreSQL is running, the `rezero` database exists, the `DATABASE_URL` in [backend/.env](backend/.env) is correct, and the `vector` extension is enabled.

If authentication or file uploads fail, verify the Clerk, Gemini, and S3 values in [backend/.env](backend/.env) and the publishable Clerk key in [frontend/.env.local](frontend/.env.local).
