# Spotnana Chat

An AI-powered chat assistant built with Next.js, the Vercel AI SDK, and OpenAI. Supports real-time streaming responses, markdown rendering, and persistent multi-session chat history.

## Features

- **Streaming responses** — tokens appear as they are generated
- **Markdown rendering** — code blocks, lists, bold, headers
- **Chat history** — sessions are saved locally and persist across page refreshes
- **Clear / Stop** — cancel generation mid-stream or clear the current conversation
- **Error handling** — clear error states for network failures or API errors

## Setup

### Prerequisites

- Node.js 20+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
git clone <repo-url>
cd spotnana-chat
npm install
```

### Environment

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  api/chat/route.ts       # Streaming API route (server-side OpenAI call)
  page.tsx                # Entry point
  layout.tsx              # Root layout
components/
  chat/
    chat-interface.tsx    # Main shell — state, sessions, layout
    message-bubble.tsx    # Individual message with markdown support
    prompt-input.tsx      # Textarea + send/stop button
    history-sidebar.tsx   # Session list sidebar
  ui/                     # shadcn/ui components
lib/
  chat-storage.ts         # localStorage session persistence
DECISIONS.md              # Engineering decision log
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| AI | Vercel AI SDK + OpenAI `gpt-4o-mini` |
| UI | shadcn/ui + Tailwind CSS v4 |
| Persistence | Browser `localStorage` |
| Markdown | `react-markdown` |

See [DECISIONS.md](./DECISIONS.md) for the reasoning behind each choice.
