"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { SendHorizontal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { readSSE, getStreamingMarkdown } from "@/lib/utils";

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

interface MessageResponse {
  messages: MessageItem[];
  has_more: boolean;
  last_message_id?: string;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function MessageList({
  workspaceId,
  chatId,
}: {
  workspaceId: string;
  chatId?: string;
}) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPromptHandled = useRef(false);
  const workspacePath = `/workspace/${workspaceId}`;

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollDone = useRef(false);
  const previousPageCount = useRef(0);
  const shouldAutoScroll = useRef(false);

  const queryClient = useQueryClient();

  const fetchMessages = async ({
    pageParam,
  }: {
    pageParam: string | null;
  }): Promise<MessageResponse> => {
    const params = new URLSearchParams({
      workspace_id: workspaceId,
      chat_id: chatId ?? "",
      limit: "50",
    });
    if (pageParam) params.set("before", pageParam);

    const response = await fetch(`${apiUrl}/messages?${params}`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch messages");
    }
    const page = await response.json();
    return {
      ...page,
      messages: page.messages.map(
        (message: {
          id: string;
          role: MessageRole;
          content: string;
          created_at: string;
        }) => ({
          ...message,
          createdAt: message.created_at,
        }),
      ),
    };
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["messages", workspaceId, chatId],
      queryFn: fetchMessages,
      initialPageParam: null,
      enabled: Boolean(chatId),
      getNextPageParam: (lastPage) => {
        return lastPage.has_more ? lastPage.last_message_id : undefined;
      },
    });

  // The UI will still update even though we are not using react state since this component updates whenever cache
  const messages =
    data?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages.slice().reverse()) ?? [];

  // we use the useCallback hook to memoize the onEvent function and prevent unnecessary re-renders
  // we use it because onEvent is used in handleSend and we don't want to trigger the function on every render
  const onEvent = useCallback(
    (event: string, data: string, message_id: string, response_id: string) => {
      if (event === "message") {
        queryClient.setQueryData(
          ["messages", workspaceId, chatId],
          (oldData: InfiniteData<MessageResponse>) => {
            return {
              ...oldData,
              pages: oldData.pages.map((page: MessageResponse) => {
                return {
                  ...page,
                  messages: page.messages.map((msg: MessageItem) => {
                    if (msg.id === response_id) {
                      return { ...msg, content: msg.content + data };
                    }
                    return msg;
                  }),
                };
              }),
            };
          },
        );
      }

      if (event === "close") {
        const parsedData = JSON.parse(data);
        const {
          user_message_id,
          response_message_id,
          user_message_created_at,
          response_message_created_at,
        } = parsedData;
        queryClient.setQueryData(
          ["messages", workspaceId, chatId],
          (oldData: InfiniteData<MessageResponse>) => {
            return {
              ...oldData,
              pages: oldData.pages.map((page: MessageResponse) => {
                return {
                  ...page,
                  messages: page.messages.map((msg: MessageItem) => {
                    if (msg.id === message_id) {
                      return {
                        ...msg,
                        createdAt: user_message_created_at,
                        id: user_message_id,
                      };
                    }
                    if (msg.id === response_id) {
                      return {
                        ...msg,
                        createdAt: response_message_created_at,
                        id: response_message_id,
                      };
                    }
                    return msg;
                  }),
                };
              }),
            };
          },
        );
      }
    },
    [chatId, queryClient, workspaceId],
  );

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !data || data.pages.length === 0) return;

    // Scroll to the bottom only on the initial load
    if (!isInitialScrollDone.current) {
      container.scrollTop = container.scrollHeight;
      isInitialScrollDone.current = true;
      previousPageCount.current = data.pages.length;
      return;
    }

    // Preserve the viewport when older messages are prepended.
    if (data.pages.length > previousPageCount.current) {
      const heightBefore = container.scrollHeight;
      requestAnimationFrame(() => {
        container.scrollTop += container.scrollHeight - heightBefore;
      });
      previousPageCount.current = data.pages.length;
      return;
    }

    // Follow newly sent messages and streamed response chunks.
    if (shouldAutoScroll.current) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [data]);

  const handleMessagesScroll = async () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 100) {
      shouldAutoScroll.current = false;
    }

    // If the user is away from the top, or if there are no more pages to fetch,
    // or if we're already fetching the next page, don't fetch older messages.
    if (container.scrollTop > 100 || !hasNextPage || isFetchingNextPage) {
      return;
    }

    await fetchNextPage();
  };

  // useCallback to memoize the handleSend function and prevent unnecessary re-renders
  // we use it because handleSend is used in useEffect and we don't want to trigger the effect on every render
  const handleSend = useCallback(
    async (prompt = draft) => {
      if (!prompt.trim()) return;
      const draft_copy = prompt;
      setDraft("");
      setLoading(true);

      try {
        if (!chatId) {
          const createResponse = await fetch(`${apiUrl}/chats/${workspaceId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              name: "New Chat",
              prompt: draft_copy,
            }),
          });

          if (!createResponse.ok) {
            throw new Error("Failed to create chat");
          }

          const createdChat = await createResponse.json();
          if (!createdChat.chat_id) {
            throw new Error("Chat creation did not return a chat ID");
          }

          await queryClient.invalidateQueries({
            queryKey: ["workspace", workspaceId, "recent-chats"],
          });
          router.push(
            `${workspacePath}/${createdChat.chat_id}?prompt=${encodeURIComponent(draft_copy)}`,
          );
          return;
        }

        const response = await fetch(`${apiUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            chat_id: chatId,
            workspace_id: workspaceId,
            prompt: draft_copy,
          }),
        });
        if (!response.body) {
          throw new Error("No response body");
        }
        const temp_user_message = {
          id: crypto.randomUUID(),
          role: "user",
          content: draft_copy,
          createdAt: new Date().toISOString(),
        };
        const temp_response_message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        };
        shouldAutoScroll.current = true;
        queryClient.setQueryData(
          ["messages", workspaceId, chatId],
          (oldData: InfiniteData<MessageResponse> | undefined) => {
            // If oldData is undefined, we initialize it with a default structure to ensure that the pages array is always defined. This prevents potential runtime errors when we try to access or modify the pages array later in the function.
            const pages = oldData?.pages ?? [
              {
                messages: [],
                has_more: false,
                last_message_id: undefined,
              },
            ];

            return {
              ...oldData,
              pageParams: oldData?.pageParams ?? [null],
              pages: pages.map((page: MessageResponse, index) => {
                if (index === 0) {
                  return {
                    ...page,
                    messages: [
                      temp_response_message,
                      temp_user_message,
                      ...page.messages,
                    ],
                  };
                }
                return page;
              }),
            };
          },
        );
        setIsStreaming(true);
        setStreamingId(temp_response_message.id);
        await readSSE(
          response,
          temp_user_message.id,
          temp_response_message.id,
          onEvent,
        );
        // necessary to refetch so that the markdown is rendered correctly.
        await queryClient.refetchQueries({
          queryKey: ["messages", workspaceId, chatId],
        });
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        shouldAutoScroll.current = false;
        setIsStreaming(false);
        setStreamingId(null);
        setLoading(false);
      }
    },
    [chatId, draft, onEvent, queryClient, router, workspaceId, workspacePath],
  );

  useEffect(() => {
    const initialPrompt = searchParams.get("prompt");
    if (!chatId || !initialPrompt || initialPromptHandled.current) return;

    initialPromptHandled.current = true;
    // basically we don't care about the returned promise, we just want to call the function and let it run
    void handleSend(initialPrompt);
    router.replace(pathname);
  }, [chatId, handleSend, pathname, router, searchParams]);
  // functions need to be in the dependency array to prevent stale closures, but we don't want to trigger the effect on every render, so we use useCallback to memoize them
  // Stale Closures: https://react.dev/learn/stale-closures

  return (
    <div className="flex h-full flex-col">
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 space-y-5 overflow-y-auto pb-4"
      >
        {isFetchingNextPage && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Loading older messages...
          </p>
        )}
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
                    {isStreaming && message.id === streamingId
                      ? getStreamingMarkdown(message.content, isStreaming)
                      : message.content}
                  </ReactMarkdown>
                  {message.id === streamingId && (
                    <span className="ml-1 inline-block animate-pulse text-stone-400">
                      ▍
                    </span>
                  )}
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
          onClick={() => void handleSend()}
          disabled={!draft.trim() || loading}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition hover:bg-blue-600"
        >
          <SendHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
