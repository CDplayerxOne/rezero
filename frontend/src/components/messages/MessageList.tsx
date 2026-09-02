"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SendHorizontal } from "lucide-react";
import ReactMarkdown from "react-markdown";

const markdownClassNames = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-3 list-disc pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-3 list-decimal pl-5">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="mb-1">{children}</li>
  ),
  code: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children?: ReactNode;
    node?: unknown;
  }) => (
    <code
      className={`rounded bg-stone-100 px-1 py-0.5 text-[0.9em] ${className ?? ""}`}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-stone-100 p-3">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mb-3 border-l-2 border-stone-300 pl-3 text-stone-600">
      {children}
    </blockquote>
  ),
};

type MessageRole = "user" | "assistant";

type MessageItem = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

const buildMockMessages = (
  workspaceId: string,
  chatId: string | undefined,
): MessageItem[] => {
  const suffix = `${workspaceId}:${chatId ?? "new-chat"}`;

  return [
    {
      id: `${suffix}-1`,
      role: "assistant",
      content:
        "Hi! I’m ready to help with this workspace. Upload files, ask questions, and I’ll keep the context grounded in your project.",
      createdAt: "9:41 AM",
    },
    {
      id: `${suffix}-2`,
      role: "user",
      content: "Summarize the latest notes for this workspace.",
      createdAt: "9:42 AM",
    },
    {
      id: `${suffix}-3`,
      role: "assistant",
      content:
        "The latest updates are centered on product planning, file uploads, and workspace navigation. I can synthesize the key decisions once those artifacts are in the workspace.",
      createdAt: "9:42 AM",
    },
  ];
};

export function MessageList({
  workspaceId,
  chatId,
}: {
  workspaceId: string;
  chatId?: string;
}) {
  const [draft, setDraft] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", workspaceId, chatId],
    queryFn: () => buildMockMessages(workspaceId, chatId),
    staleTime: 60 * 1000,
  });

  const handleSend = () => {
    if (!draft.trim()) return;
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              {isUser ? (
                <div className="max-w-2xl rounded-3xl bg-blue-500 px-4 py-3 text-sm text-white shadow-sm">
                  <div className="whitespace-pre-wrap leading-6">
                    {message.content}
                  </div>
                  <div className="mt-2 text-[10px] text-blue-100">
                    {message.createdAt}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl text-sm leading-7 text-stone-800">
                  <ReactMarkdown components={markdownClassNames}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-end gap-2 border-t border-stone-200 pt-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          className="max-h-48 min-h-12 flex-1 resize-none rounded-3xl border border-stone-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What's on your mind?"
        />
        <button
          type="button"
          onClick={handleSend}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition hover:bg-blue-600"
        >
          <SendHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
