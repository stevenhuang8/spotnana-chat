"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useCallback, useState } from "react";
import { MessageBubble } from "./message-bubble";
import { PromptInput } from "./prompt-input";
import {
  ChatSession,
  getSessions,
  saveSession,
  deleteSession,
  getActiveSessionId,
  setActiveSessionId,
  generateSessionTitle,
} from "@/lib/chat-storage";
import { HistorySidebar } from "./history-sidebar";
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
  const { messages, status, sendMessage, setMessages, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastInputRef = useRef<string>("");

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
    lastInputRef.current = input;
    sendMessage({ text: input });
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleRetry = useCallback(() => {
    if (!lastInputRef.current) return;
    setMessages((prev) =>
      prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev
    );
    sendMessage({ text: lastInputRef.current });
  }, [sendMessage, setMessages]);

  return (
    <div className="flex flex-row h-full rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm border border-white/10 shadow-2xl">
      {/* History sidebar */}
      <HistorySidebar
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h1 className="font-semibold text-sm text-white">Spotnana Chat</h1>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="gap-1.5 text-xs text-white/50 hover:text-red-400 hover:bg-white/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <p className="text-sm font-medium text-white/80">Start a conversation</p>
              <p className="text-sm text-white/80">Ask me anything and I&apos;ll help you out!</p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

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

          {error && (
            <div className="flex flex-col items-center gap-2 text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 text-center">
              <span>Something went wrong. Please try again.</span>
              <button
                onClick={handleRetry}
                className="underline hover:text-red-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3">
          <PromptInput
            input={input}
            isLoading={isLoading}
            onChange={setInput}
            onSubmit={handleSubmit}
            onStop={stop}
          />
        </div>
      </div>
    </div>
  );
}
