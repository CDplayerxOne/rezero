import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/dist/client/components/navigation";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

const getWorkspace = async (slug: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const forwarded = Object.fromEntries(await headers());

  console.log("Fetching workspace with slug:", slug);

  const res = await fetch(`${apiUrl}/workspaces/${slug}`, {
    headers: forwarded,
    cache: "no-store",
  });

  if (res.status === 403) {
    redirect("/dashboard");
  }

  if (res.status === 404) {
    throw new Error(`Workspace with id ${slug} not found`);
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch workspaces: ${res.status} ${res.statusText}`,
    );
  }

  return await res.json();
};

export default async function WorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  await auth.protect();
  const { id } = await params;
  console.log(id);

  const workspace = await getWorkspace(id);

  if (!workspace) {
    throw new Error(`Workspace with id ${id} not found`);
  }

  return <WorkspaceShell id={workspace.public_id} name={workspace.name} />;
}
