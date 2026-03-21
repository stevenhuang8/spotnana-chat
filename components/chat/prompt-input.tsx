"use client";

import { useRef, useCallback, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Loader2 } from "lucide-react";

interface PromptInputProps {
  input: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function PromptInput({
  input,
  isLoading,
  onChange,
  onSubmit,
}: PromptInputProps) {
  // Track last submit timestamp to guard against rapid double-sends.
  // Using a ref (not state) so the timestamp update never triggers a re-render.
  // Without this guard, a fast double-click or accidental key repeat could fire
  // two API calls for the same message, wasting tokens and duplicating responses.
  const lastSubmitRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

  const handleSubmit = useCallback(() => {
    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_MS) return;
    if (!input.trim() || isLoading) return;
    lastSubmitRef.current = now;
    onSubmit();
  }, [input, isLoading, onSubmit]);

  // Enter sends; Shift+Enter inserts a newline.
  // This matches the chat UX convention users expect from apps like Slack and ChatGPT.
  // preventDefault() stops the textarea from inserting a newline on plain Enter.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything… (Shift+Enter for newline)"
        className="resize-none min-h-[52px] max-h-[200px] flex-1"
        disabled={isLoading}
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={!input.trim() || isLoading}
        size="icon"
        className="shrink-0 h-[52px] w-[52px]"
        title="Send message"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <SendHorizonal className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
