import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

async function getWorkspace(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const forwarded = Object.fromEntries(await headers());

  const res = await fetch(`${apiUrl}/workspaces/${slug}`, {
    headers: forwarded,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch workspace ${slug}`);
  }

  return res.json();
}

export default async function WorkspaceChatPage({
  params,
}: {
  params: { id: string; chat_id: string };
}) {
  await auth.protect();
  const { id } = await params;
  const workspace = await getWorkspace(id);

  return <WorkspaceShell id={workspace.public_id} name={workspace.name} />;
}
