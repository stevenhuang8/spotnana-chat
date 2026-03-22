"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useCallback, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { PromptInput } from "./prompt-input";
import { HistorySidebar } from "./history-sidebar";
import {
  ChatSession,
  getSessions,
  saveSession,
  deleteSession,
  getActiveSessionId,
  setActiveSessionId,
  generateSessionTitle,
} from "@/lib/chat-storage";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

function generateId(): string {
  return crypto.randomUUID();
}

export function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSession] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // Load sessions and active session from localStorage after hydration.
  // Must run client-side only — localStorage doesn't exist on the server,
  // so reading it inside useEffect prevents a Next.js hydration mismatch.
  // We also restore the active session's messages here via setMessages.
  useEffect(() => {
    const stored = getSessions();
    setSessions(stored);
    const activeId = getActiveSessionId();
    if (activeId) {
      const session = stored.find((s) => s.id === activeId);
      if (session) {
        setActiveSession(activeId);
        setMessages(session.messages);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // AI SDK v6 uses DefaultChatTransport for routing.
  // This separates the transport concern from the hook itself,
  // making it easier to swap endpoints or add headers without touching hook logic.
  const { messages, status, sendMessage, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message on every update.
  // "smooth" keeps the scroll visually fluid during token streaming.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist the session when streaming completes so the full AI response is saved.
  useEffect(() => {
    if (isLoading || messages.length === 0) return;

    const sessionId = activeSessionId ?? generateId();
    const session: ChatSession = {
      id: sessionId,
      title: generateSessionTitle(
        messages[0].parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") || "New chat"
      ),
      messages: messages as ChatSession["messages"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveSession(session);
    setSessions(getSessions());

    if (!activeSessionId) {
      setActiveSession(sessionId);
      setActiveSessionId(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  function handleNew() {
    const id = generateId();
    setActiveSession(id);
    setActiveSessionId(id);
    setMessages([]);
    setInput("");
  }

  function handleSelect(session: ChatSession) {
    setActiveSession(session.id);
    setActiveSessionId(session.id);
    // setMessages replaces the current list with the selected session's history,
    // restoring the conversation without any network request.
    setMessages(session.messages);
    setInput("");
  }

  function handleDelete(id: string) {
    deleteSession(id);
    setSessions(getSessions());
    if (activeSessionId === id) {
      setActiveSession(null);
      setMessages([]);
    }
  }

  function handleClear() {
    setMessages([]);
    setInput("");
    if (activeSessionId) {
      deleteSession(activeSessionId);
      setSessions(getSessions());
    }
    const newId = generateId();
    setActiveSession(newId);
    setActiveSessionId(newId);
  }

  // In AI SDK v6, sendMessage() replaces handleSubmit().
  // It accepts a plain text object and internally formats it into
  // the UIMessage structure that DefaultChatTransport sends to the API.
  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }, [input, isLoading, sendMessage]);

  return (
    <div className="flex h-full overflow-hidden">
      <HistorySidebar
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="font-semibold text-sm">Spotnana Chat</h1>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </header>

        <Separator />

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
              <p className="text-2xl">✦</p>
              <p className="text-sm font-medium">How can I help you today?</p>
              <p className="text-xs">Type a message below to get started.</p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Typing indicator shown while the AI is generating a response */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/60 backdrop-blur-md rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <span className="flex gap-1 items-center text-stone-500 text-xs">
                  <span className="animate-bounce [animation-delay:0ms]">•</span>
                  <span className="animate-bounce [animation-delay:150ms]">•</span>
                  <span className="animate-bounce [animation-delay:300ms]">•</span>
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
              Something went wrong. Please try again.
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 py-3 border-t border-border">
          <PromptInput
            input={input}
            isLoading={isLoading}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
