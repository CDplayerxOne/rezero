import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        This route is protected by Clerk middleware. Signed-in users can view
        it.
      </p>
      <div className="mt-8 rounded-xl border p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-2 text-lg font-medium">
          {user?.fullName ?? user?.emailAddresses[0]?.emailAddress}
        </p>
      </div>
    </main>
  );
}
