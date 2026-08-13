"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import Link from "next/link";
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasValidClerkKey = Boolean(
  publishableKey && !publishableKey.includes("your_clerk"),
);

type WorkspaceItem = { name: string; public_id: string };

export default function WorkspaceShell({
  id,
  name,
}: {
  id: string;
  name?: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "files" | "clips">(
    "chat",
  );
  const { user } = useUser();

  // placeholder workspaces
  const workspaces: WorkspaceItem[] = [
    { name: "Personal", public_id: "1111-aaaa" },
    { name: "Team Alpha", public_id: "2222-bbbb" },
    { name: name ?? "Current Workspace", public_id: id },
  ];

  function openWorkspace(w: WorkspaceItem) {
    setShowModal(false);
    router.push(`/workspace/${w.public_id}`);
  }

  return (
    <div className="flex h-screen w-screen">
      <aside className="w-64 border-r p-4 flex flex-col">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 m-4">
            <Link href="/" className="text-lg font-semibold">
              RE:ZERO
            </Link>
          </div>
          <div className="relative">
            <Button variant="ghost" onClick={() => setShowModal(true)}>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{name ?? "Workspace"}</span>
                <span className="text-sm text-muted-foreground">▼</span>
              </div>
            </Button>

            {showModal ? (
              <div className="absolute left-0 top-12 z-50 w-72 rounded border bg-background p-4 shadow">
                <div className="flex flex-col gap-2">
                  {workspaces.map((w) => (
                    <button
                      key={w.public_id}
                      className="text-left rounded px-3 py-2 hover:bg-accent"
                      onClick={() => openWorkspace(w)}
                    >
                      <div className="font-medium">{w.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.public_id}
                      </div>
                    </button>
                  ))}
                  <div className="mt-2 border-t pt-2">
                    <Button asChild size="sm">
                      <a onClick={() => setShowModal(false)}>Close</a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <nav className="flex flex-col gap-2 grow">
          <button
            className={`w-full rounded px-3 py-2 text-left ${activeTab === "chat" ? "bg-accent" : "hover:bg-accent"}`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`w-full rounded px-3 py-2 text-left ${activeTab === "files" ? "bg-accent" : "hover:bg-accent"}`}
            onClick={() => setActiveTab("files")}
          >
            Files
          </button>
          <button
            className={`w-full rounded px-3 py-2 text-left ${activeTab === "clips" ? "bg-accent" : "hover:bg-accent"}`}
            onClick={() => setActiveTab("clips")}
          >
            Clips
          </button>
        </nav>
        <div className="flex items-center gap-2 w-full">
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.firstName} {user.lastName}
            </span>
          )}
          {hasValidClerkKey && (
            <>
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6">
        {activeTab === "chat" && (
          <div className="flex h-full flex-col gap-4">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-80 flex-col items-stretch justify-end gap-2">
                  <div className="h-full w-full overflow-auto rounded border bg-muted p-4" />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded border px-3 py-2"
                      placeholder="Type a message (UI only)"
                    />
                    <Button size="sm">Send</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "files" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Files</h2>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" />
                  <Button size="sm">Upload</Button>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Card key={n}>
                  <CardHeader>
                    <CardTitle>File {n}.txt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Uploaded — 12 KB
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

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
      <div className="fixed right-6 top-6 z-50">
        <Button variant="outline" onClick={() => setShowNotes((s) => !s)}>
          Notes
        </Button>
      </div>
    </div>
  );
}
