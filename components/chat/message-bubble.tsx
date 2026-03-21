"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { UIMessage } from "ai";

interface MessageBubbleProps {
  message: UIMessage;
}

// Extract the plain text from a UIMessage.
// In AI SDK v6, message content is stored in a parts[] array rather than a
// flat string. Each part has a type; we join all "text" parts to get the
// full readable content.
function getMessageText(message: UIMessage): string {
  if (message.parts && message.parts.length > 0) {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");
  }
  return "";
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = getMessageText(message);

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          // react-markdown renders AI responses as structured HTML.
          // LLMs frequently return markdown (bold, lists, code blocks) so
          // rendering raw strings would display literal ** and ``` to the user.
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code className="block bg-black/10 dark:bg-white/10 rounded p-2 text-xs font-mono overflow-x-auto my-2">
                    {children}
                  </code>
                ) : (
                  <code className="bg-black/10 dark:bg-white/10 rounded px-1 text-xs font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="overflow-x-auto">{children}</pre>
              ),
              h1: ({ children }) => (
                <h1 className="font-bold text-base mb-1">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="font-semibold mb-1">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-medium mb-1">{children}</h3>
              ),
              a: ({ children, href }) => (
                <a href={href} className="underline" target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
