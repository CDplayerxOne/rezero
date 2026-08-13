import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

async function getWorkspaces() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const forwarded = Object.fromEntries(await headers());
  const res = await fetch(`${apiUrl}/workspaces`, {
    headers: forwarded,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch workspaces: ${res.status} ${res.statusText}`,
    );
  }
  return await res.json();
}

export default async function DashboardPage() {
  await auth.protect();

  const user = await currentUser();

  // Forward incoming request headers (including Clerk cookies) to the backend
  const workspaces = await getWorkspaces();

  if (Array.isArray(workspaces) && workspaces.length > 0) {
    workspaces.sort((a, b) =>
      (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
    );
    const latest = workspaces[0];
    if (latest?.public_id) {
      redirect(`/workspace/${latest.public_id}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-lg flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold">Welcome</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Create your first workspace to get started.
      </p>
      <div className="mt-8 rounded-xl p-6 shadow-md outline-gray-300 outline-1">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-2 text-lg font-medium">
          {user?.fullName ?? user?.emailAddresses[0]?.emailAddress}
        </p>
      </div>

      <div className="mt-8">
        <OnboardingForm />
      </div>
    </main>
  );
}
