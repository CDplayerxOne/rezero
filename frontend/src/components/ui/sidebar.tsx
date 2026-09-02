"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import {
  ChevronDown,
  ChevronUp,
  Files,
  MessageCircleMore,
  Paperclip,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useOutsideClick } from "@/hooks/useOutsideClick";

type WorkspaceItem = { name: string; public_id: string };
type RecentChatItem = { id: string; name: string };

type SidebarProps = {
  id: string;
  name?: string;
  activeTab?: "chat" | "files" | "clips";
  activeChatId?: string;
  onChatOpen?: (chatId: string) => void;
  onWorkspaceChange?: (workspaceId: string) => void;
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const hasValidClerkKey = Boolean(
  publishableKey && !publishableKey.includes("your_clerk"),
);

const fetchWorkspaces = async (): Promise<WorkspaceItem[]> => {
  const response = await fetch(`${apiUrl}/workspaces`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch workspaces");
  }

  return response.json();
};

const fetchRecentChats = async (
  workspaceId: string,
): Promise<RecentChatItem[]> => {
  const response = await fetch(`${apiUrl}/chats/${workspaceId}/recent`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch recent chats");
  }
  return response.json();
};

export function Sidebar({
  id,
  name,
  activeTab = "chat",
  activeChatId,
  onChatOpen,
  onWorkspaceChange,
}: SidebarProps) {
  const router = useRouter();
  const workspacePath = `/workspace/${id}`;
  const [showModal, setShowModal] = useState(false);
  const { user } = useUser();
  const modalRef = useOutsideClick(() => setShowModal(false));

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  const { data: recentChats = [] } = useQuery({
    queryKey: ["workspace", id, "recent-chats"],
    queryFn: () => fetchRecentChats(id),
    staleTime: 60 * 1000,
  });

  const workspaceOptions: WorkspaceItem[] =
    workspaces.length > 0
      ? workspaces
      : [{ name: name ?? "Current Workspace", public_id: id }];

  function openWorkspace(w: WorkspaceItem) {
    setShowModal(false);
    if (onWorkspaceChange) {
      onWorkspaceChange(w.public_id);
      return;
    }
    router.push(`/workspace/${w.public_id}`);
  }

  function navigateToTab(tab: "chat" | "files" | "clips") {
    if (tab === "chat") {
      if (onWorkspaceChange) {
        onWorkspaceChange(id);
        return;
      }
      router.push(workspacePath);
      return;
    }

    const target = `${workspacePath}/${tab}`;
    if (onWorkspaceChange) {
      router.push(target);
      return;
    }
    router.push(target);
  }

  function openChat(chatId: string) {
    const target = `${workspacePath}/${chatId}`;
    if (onChatOpen) {
      onChatOpen(chatId);
      return;
    }
    router.push(target);
  }

  return (
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
                {workspaceOptions.map((w) => (
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
          className={`w-full flex gap-2 hover:cursor-pointer rounded-lg px-3 py-2 text-left ${activeTab === "chat" && !activeChatId ? "bg-stone-200 text-blue-500 font-bold" : "hover:bg-stone-200"}`}
          onClick={() => navigateToTab("chat")}
        >
          <MessageCircleMore
            className={`${activeTab === "chat" && !activeChatId && "text-blue-500"}`}
          />
          New Chat
        </button>
        <button
          className={`w-full flex gap-2 hover:cursor-pointer rounded-lg px-3 py-2 text-left ${activeTab === "files" ? "bg-stone-200 text-blue-500 font-bold" : "hover:bg-stone-200"}`}
          onClick={() => navigateToTab("files")}
        >
          <Files className={`${activeTab === "files" && "text-blue-500"}`} />
          Files
        </button>
        <button
          className={`w-full flex gap-2 hover:cursor-pointer rounded-lg px-3 py-2 text-left ${activeTab === "clips" ? "bg-stone-200 text-blue-500 font-bold" : "hover:bg-stone-200"}`}
          onClick={() => navigateToTab("clips")}
        >
          <Paperclip
            className={`${activeTab === "clips" && "text-blue-500"}`}
          />
          Clips
        </button>
      </nav>

      <div className="grow mt-4 overflow-y-auto">
        <h2 className="font-semibold m-2">Recent Chats</h2>
        {recentChats.map((chat) => {
          const isActive = activeChatId === chat.id;

          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => openChat(chat.id)}
              className={`w-full rounded-lg p-2 pl-4 text-left ${
                isActive
                  ? "bg-stone-200 text-blue-500 font-bold"
                  : "hover:bg-stone-200 hover:cursor-pointer"
              }`}
            >
              {chat.name}
            </button>
          );
        })}
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
  );
}
