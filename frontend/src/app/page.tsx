import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col justify-center px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border px-3 py-1 text-sm">
            Next.js + FastAPI starter
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Authentication, UI, and a ready API foundation.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            This starter combines Clerk auth on the frontend with a FastAPI +
            PostgreSQL backend for your next product.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
              >
                API docs
              </a>
            </Button>
          </div>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Included pieces</CardTitle>
            <CardDescription>
              Frontend and backend are scaffolded and wired for quick iteration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border p-3">
              Clerk authentication middleware and sign-in UI
            </div>
            <div className="rounded-lg border p-3">
              shadcn/ui components with Tailwind styling
            </div>
            <div className="rounded-lg border p-3">
              FastAPI app with SQLAlchemy and Alembic-ready structure
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
