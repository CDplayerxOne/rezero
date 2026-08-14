"use client";

import { useState } from "react";
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
import {
  ChevronDown,
  ChevronUp,
  Files,
  MessageCircleMore,
  Paperclip,
  SendHorizontal,
} from "lucide-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";

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
  const modalRef = useOutsideClick(() => setShowModal(false));

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
    <div className="flex h-screen w-screen font-sans">
      <aside className="w-64 p-4 flex flex-col border-r border-stone-300 bg-stone-50">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 m-4">
            <Link href="/" className="text-lg font-semibold">
              RE:ZERO
            </Link>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowModal(true)}
              className="hover:bg-stone-200 hover:cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{name ?? "Workspace"}</span>
                {showModal ? <ChevronUp /> : <ChevronDown />}
              </div>
            </Button>

            {showModal ? (
              <div
                ref={modalRef}
                className="absolute left-0 top-12 z-50 w-72 rounded border bg-background p-4 shadow"
              >
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

        <nav className="flex flex-col gap-2">
          <button
            className={`w-full flex gap-2 hover:cursor-pointer rounded-lg px-3 py-2 text-left ${activeTab === "chat" ? "bg-stone-200 text-blue-500 font-bold" : "hover:bg-stone-200"}`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageCircleMore
              className={`${activeTab === "chat" && "text-blue-500"}`}
            />
            New Chat
          </button>
          <button
            className={`w-full flex gap-2 hover:cursor-pointer rounded-lg px-3 py-2 text-left ${activeTab === "files" ? "bg-stone-200 text-blue-500 font-bold" : "hover:bg-stone-200"}`}
            onClick={() => setActiveTab("files")}
          >
            <Files className={`${activeTab === "files" && "text-blue-500"}`} />
            Files
          </button>
          <button
            className={`w-full flex gap-2 hover:cursor-pointer rounded-lg px-3 py-2 text-left ${activeTab === "clips" ? "bg-stone-200 text-blue-500 font-bold" : "hover:bg-stone-200"}`}
            onClick={() => setActiveTab("clips")}
          >
            <Paperclip
              className={`${activeTab === "clips" && "text-blue-500"}`}
            />
            Clips
          </button>
        </nav>
        <div className="grow mt-4 overflow-y-auto">
          <h2 className="font-semibold m-2">Recent Chats</h2>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="hover:bg-stone-200 rounded-lg p-2 pl-4 hover:cursor-pointer"
            >
              Chat {n}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 w-full py-2">
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
          {user && (
            <span className="text-md font-bold text-muted-foreground">
              {user.firstName} {user.lastName}
            </span>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6">
        {activeTab === "chat" && (
          <div className="flex h-full justify-center">
            <div className="flex h-full lg:w-2/3 flex-col gap-4">
              <div className="grow"></div>
              <div className="flex justify-center gap-2">
                <input
                  className="flex-1 rounded-3xl border px-3 py-2 mb-2 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-2xl"
                  placeholder="What's on your mind?"
                />
                <button className="rounded-3xl flex gap-2 bg-blue-500 px-4 py-2 mb-2 text-white shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <SendHorizontal />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div className="flex flex-col gap-4">
            <div className="">
              <h2 className="text-lg font-semibold m-2">Files</h2>
              <button className="rounded-3xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 shadow-md hover:bg-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Upload
              </button>
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
