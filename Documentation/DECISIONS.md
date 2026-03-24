# Engineering Decisions

This document explains the *why* behind key technical choices and patterns used in this project. It exists so that a reviewer or future developer can understand the intent behind implementation details that might otherwise look arbitrary.

---

## Tech Stack

### Next.js (App Router)
Next.js was chosen because it ships both the React frontend and the API routes in one project, eliminating the need for a separate backend server. The App Router (introduced in Next.js 13) replaces the older Pages Router and enables React Server Components, fine-grained streaming, and nested layouts — all of which make it the modern standard for production Next.js apps.

### Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`)
The AI SDK was selected over raw `fetch` to the OpenAI REST API for three reasons:
1. **Streaming out of the box** — `streamText()` on the server and `useChat()` on the client wire up token-by-token streaming with a single line each. Replicating this manually requires managing `ReadableStream`, `TextDecoder`, and incremental state — significant boilerplate with many edge cases.
2. **Error and loading state management** — `useChat` exposes `isLoading`, `error`, and `stop()` as first-class values, meaning the UI never needs to manage these manually with `useState`.
3. **Message history format** — The SDK maintains an array of typed `Message` objects (role + content + id) that map directly to the OpenAI messages format, making persistence and replay trivial.

### shadcn/ui + Tailwind CSS
shadcn/ui provides unstyled, composable components (Button, Textarea, Separator, ScrollArea) built on Radix UI primitives. The key advantage over a library like MUI or Chakra is that components are **copied into the project** rather than imported from a package — meaning full ownership, no runtime overhead, and no version-lock conflicts. Tailwind handles all styling via utility classes, which keeps CSS co-located with markup and eliminates dead CSS.

### `gpt-5.2` model
The model was upgraded from `gpt-4o-mini` to `gpt-5.2`. See `Documentation/model-upgrade-gpt5.2.md` for the full tradeoff analysis. In summary:
- `gpt-5.2` provides significantly stronger reasoning, a larger context window, and better performance on multi-step agentic tasks.
- For a travel management context (Spotnana), accuracy and policy reasoning depth outweigh the higher per-token cost.
- The change was a single line in `app/api/chat/route.ts`.

---

## Patterns & Implementation Choices

### Debouncing rapid submit clicks (`components/chat/prompt-input.tsx`)
```ts
const lastSubmitRef = useRef<number>(0);
const DEBOUNCE_MS = 500;

const handleSubmit = useCallback(() => {
  const now = Date.now();
  if (now - lastSubmitRef.current < DEBOUNCE_MS) return;
  ...
  lastSubmitRef.current = now;
}, [...]);
```
A `useRef` timestamp is compared against the current time on every submit attempt. If less than 500ms has passed since the last submission, the call is silently dropped. This prevents:
- Accidental double-clicks triggering two API calls.
- Keyboard users hitting Enter twice quickly and sending duplicate messages.
- Each redundant call wastes tokens and can create duplicate messages in the UI.

A `useRef` is used instead of `useState` because it does not trigger a re-render — we only need to read/write the timestamp, not display it.

### Enter to send, Shift+Enter for newlines (`components/chat/prompt-input.tsx`)
```ts
if (e.key === "Enter" && !e.shiftKey) {
  e.preventDefault();
  handleSubmit();
}
```
This is the universally expected chat UX (WhatsApp, Slack, ChatGPT). Plain Enter sends; Shift+Enter inserts a newline. `e.preventDefault()` suppresses the default behavior of Enter (adding a newline in a `<textarea>`).

### Stop button during streaming (`components/chat/prompt-input.tsx`)
The Send button is replaced with a Stop button while `isLoading` is true. This calls `stop()` from `useChat`, which cancels the in-flight fetch and stops the stream. This is important UX for long responses — the user should always be able to interrupt without refreshing the page.

### Client-side localStorage for chat history (`lib/chat-storage.ts`)
Chat sessions are persisted to `localStorage` instead of a backend database. This decision was made because:
- The assessment scope does not require authentication or cross-device sync.
- It avoids infrastructure complexity (no database, no auth, no API for CRUD).
- Sessions survive page refresh without any server round-trip.
- The storage module is cleanly abstracted so swapping to a real DB later requires changing only `chat-storage.ts`.

The `typeof window === "undefined"` guard prevents SSR crashes, since `localStorage` only exists in the browser.

### Hydration-safe session loading (`components/chat/chat-interface.tsx`)
```ts
useEffect(() => {
  const stored = getSessions();
  setSessions(stored);
  ...
}, []);
```
Sessions are loaded inside a `useEffect` (which only runs client-side) rather than during render. This prevents a server/client HTML mismatch (hydration error) since Next.js renders the initial HTML on the server where `localStorage` does not exist.

### Auto-scroll to latest message
```ts
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
```
A `ref` is attached to an invisible `<div>` at the bottom of the message list. Every time `messages` changes, `scrollIntoView` is called. `behavior: "smooth"` provides a pleasant animation rather than a jarring jump. This fires for both user messages and streamed assistant tokens.

### `useCallback` on submit and key handler (`components/chat/prompt-input.tsx`)
Both `handleSubmit` and `handleKeyDown` are wrapped in `useCallback`. This prevents their identity from changing on every render, which matters because:
- The submit handler is passed as a prop — without memoization, the child component re-renders every time the parent renders.
- `handleKeyDown` depends on `handleSubmit`, so it also needs to be stable.

### Persisting sessions on message count change, not just on stream finish
```ts
useEffect(() => {
  if (messages.length > 0) persistSession();
}, [messages.length]);
```
In addition to persisting on `onFinish`, the session is also saved whenever the message count increases. This catches the case where the user closes the tab mid-stream — at minimum the user's prompt is saved, even if the assistant response was incomplete.

### React Markdown for assistant responses (`components/chat/message-bubble.tsx`)
`react-markdown` renders AI responses as formatted HTML instead of raw text. This is important because GPT models frequently use markdown (bold, lists, code blocks) in their replies. Displaying raw markdown as plain text (`**text**`, `- item`) degrades the UX significantly. User messages are rendered as plain `<p>` with `whitespace-pre-wrap` since users rarely write markdown intentionally.

### Session title derived from first message
```ts
export function generateSessionTitle(firstMessage: string): string {
  return firstMessage.slice(0, 40).trim() + (firstMessage.length > 40 ? "…" : "");
}
```
The sidebar shows the first 40 characters of the first user message as the session title. This mirrors the pattern used by ChatGPT and Claude — it gives enough context to identify a conversation at a glance without requiring the user to name sessions manually.

---

## What Was Intentionally Omitted

- **Authentication** — out of scope for the assessment; sessions are local to the browser.
- **Rate limiting** — the debounce handles accidental double-sends; real rate limiting belongs in the API route for production.
- **Markdown in user messages** — users rarely intentionally write markdown; rendering it would mostly produce noise.
- **Database** — localStorage meets the "save past prompts/responses" requirement without infrastructure overhead.
