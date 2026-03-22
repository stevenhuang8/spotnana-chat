# Stream Error Handling with Inline Retry

## Problem

When the API fails mid-stream, the partial assistant message remains in the
`messages` array as an incomplete bubble. The user sees a broken or empty
response with no indication of what went wrong or how to recover.

## Solution

The `useChat` hook from `@ai-sdk/react` exposes an `error` state that is set
when the stream fails. Display the error inline below the message list and let
the user retry manually.

### What changes

**`components/chat/chat-interface.tsx`**

1. **Track last input** — add a `lastInputRef = useRef<string>("")` and
   assign it before clearing the input field in `handleSubmit`:

   ```ts
   const handleSubmit = useCallback(() => {
     if (!input.trim() || isLoading) return;
     lastInputRef.current = input;   // ← store before clearing
     sendMessage({ text: input });
     setInput("");
   }, [input, isLoading, sendMessage]);
   ```

2. **Add a `handleRetry` callback** — when `error` is set the SDK is in a
   stable (non-streaming) state, so it is safe to call `setMessages`. Strip
   the trailing partial assistant message, then re-send:

   ```ts
   const handleRetry = useCallback(() => {
     if (!lastInputRef.current) return;
     // Remove the last (partial) assistant message before retrying.
     // Only call setMessages when the SDK is not streaming — error state
     // guarantees that here.
     setMessages((prev) =>
       prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev
     );
     sendMessage({ text: lastInputRef.current });
   }, [sendMessage, setMessages]);
   ```

3. **Update the error banner** — replace the static text block with one that
   includes a Retry button:

   ```tsx
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
   ```

## Why no `finally` block

The AI SDK already rejects the promise and sets `error` state when a stream
fails. A `finally` block in `handleSubmit` fires before the SDK finishes its
own teardown, leaving state inconsistent (e.g., clearing state the SDK still
owns). The SDK manages cleanup internally — do not add a `finally` to
`sendMessage()`.

## Constraints / No-Gos

| Constraint | Reason |
|---|---|
| No `try/catch/finally` around `sendMessage()` | Double-handling causes race conditions with the SDK's internal error flow |
| No direct message mutation to remove partial content | Use `setMessages` only — and only when SDK is in a stable state (guaranteed by `error` being set) |
| No auto-retry with backoff | Out of scope; adds significant complexity (abort signals, counters, jitter) |
| Never swallow the error silently | Always surface it so the user knows to act |

## Data flow on failure

```
sendMessage() called
  └─ stream starts
       └─ mid-stream failure
            ├─ SDK sets error state
            ├─ SDK stops streaming
            └─ UI renders error banner with Retry button
                 └─ user clicks Retry
                      ├─ setMessages strips partial assistant bubble
                      └─ sendMessage() re-sent with lastInputRef.current
```
