# RE:ZERO Frontend

A Next.js Frontend with Clerk Authentication, TailwindCSS for styling and Tanstack-Query for state management

## Setup

Install Node.js 20 or newer, then install the frontend dependencies. The commands are the same on Windows, macOS, and Linux:

```powershell
npm install
```

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The backend must be running separately. See [backend/README.md](../backend/README.md) for PostgreSQL, migrations, Clerk, Gemini, and S3 configuration.

## Run locally

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Available scripts:

```text
npm run dev      Start the development server
npm run build    Build the production application
npm run start    Start the production server
npm run lint     Run ESLint
```
