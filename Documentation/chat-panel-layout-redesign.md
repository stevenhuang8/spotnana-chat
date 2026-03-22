# Chat Panel Layout Redesign

## Why
The original chat interface filled the entire browser window, which obscured the desk background image and made the UI feel heavy. The redesign presents the chat as a centered floating panel, keeping the background visible on both sides — matching the intended aesthetic.

## What Changed

### `app/layout.tsx`
Body changed from `h-full flex flex-col` to `h-full flex items-center justify-center`. This centers whatever is in `<main>` over the full-screen background.

### `app/page.tsx`
`<main>` is now constrained to `max-w-3xl h-[88vh] mx-4`, giving the panel a fixed max width and leaving breathing room above and below.

### `components/chat/chat-interface.tsx`
- **Panel styling**: `rounded-2xl bg-black/50 backdrop-blur-sm border border-white/10 shadow-2xl` — dark glass effect that lets the background show through.
- **Tab bar**: Replaced the persistent left sidebar with two tabs at the top of the panel:
  - **Chat** — the active message view with the prompt input.
  - **Chat History** — an inline session list. Clicking a session loads it and switches back to the Chat tab. Includes a "New Chat" button.
- `activeTab` state (`"chat" | "history"`) lives in `ChatInterface`.
- All existing logic (AI calls, persistence, clear, new chat, delete session) is unchanged.

### `components/chat/history-sidebar.tsx`
No changes. The component is no longer rendered but is kept in place.

## Trade-offs
- **Fixed max-width**: The panel is capped at `max-w-3xl` (~768px). On very wide screens, the chat does not expand further — this is intentional to keep messages readable.
- **Tab-based history**: History is one tab-switch away instead of always visible. This trades ambient awareness of past sessions for a cleaner, more focused chat view.
