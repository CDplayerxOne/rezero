"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import FilesTab from "../files/FilesTab";
import { MessageList } from "../messages/MessageList";
import { Sidebar } from "../ui/sidebar";

export default function WorkspaceShell({
  id,
  name,
}: {
  id: string;
  name?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const workspacePath = `/workspace/${id}`;
  const isSpecificChatRoute =
    pathname.startsWith(`${workspacePath}/`) &&
    pathname !== `${workspacePath}/files` &&
    pathname !== `${workspacePath}/clips` &&
    !pathname.endsWith("/files") &&
    !pathname.endsWith("/clips");
  // Determine the active chat ID based on the current pathname
  // split the pathname and get the last segment if it's a specific chat route
  // ?? means if the last segment is undefined, we will set chatId to undefined
  const chatId = isSpecificChatRoute
    ? (pathname.split("/").filter(Boolean).at(-1) ?? undefined)
    : undefined;
  const activeTab: "chat" | "files" | "clips" =
    pathname === `${workspacePath}/files`
      ? "files"
      : pathname === `${workspacePath}/clips`
        ? "clips"
        : "chat";

  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="flex h-screen w-screen font-sans">
      <Sidebar
        id={id}
        name={name}
        activeTab={activeTab}
        activeChatId={chatId}
        onChatOpen={(chatId) => router.push(`${workspacePath}/${chatId}`)}
        onWorkspaceChange={(workspaceId) =>
          router.push(`/workspace/${workspaceId}`)
        }
      />

      <main className="flex-1 p-6">
        {activeTab === "chat" && (
          <div className="flex h-full justify-center">
            <div className="flex h-full w-full max-w-5xl flex-col gap-4">
              <MessageList workspaceId={id} chatId={chatId} />
            </div>
          </div>
        )}

        {activeTab === "files" && <FilesTab workspaceId={id} />}

        {activeTab === "clips" && (
          <div>
            <h2 className="text-lg font-semibold">Clips</h2>
            <p className="text-sm text-muted-foreground">No clips yet.</p>
          </div>
        )}
      </main>

      {showNotes ? (
        <aside className="w-80 border-l p-4">
          <h3 className="font-semibold">Notes</h3>
          <div className="mt-4 text-sm text-muted-foreground">(empty)</div>
        </aside>
      ) : null}

      {/* Floating notes button top-right */}
      <div className="fixed right-6 top-6 z-40">
        <Button variant="outline" onClick={() => setShowNotes((s) => !s)}>
          Notes
        </Button>
      </div>
    </div>
  );
}
