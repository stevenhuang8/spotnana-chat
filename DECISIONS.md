# Engineering Decisions

## Tech Stack

### Next.js 15 (App Router)
App Router was chosen over the Pages Router for its native support of React Server Components and route handlers. The `/api/chat/route.ts` pattern is cleaner than the Pages-era `/pages/api/` convention, and streaming responses via `Response` objects are first-class in the App Router.

### Vercel AI SDK v6
The AI SDK abstracts away the streaming plumbing. `useChat` manages message state, in-flight requests, and error recovery in one hook. The `DefaultChatTransport` pattern decouples the HTTP transport from the hook itself, making it easy to swap endpoints or add headers without touching component logic. The SDK also handles the `parts[]` message structure introduced in v6, which normalizes tool calls, text, and reasoning into a unified array rather than separate fields.

### OpenAI `gpt-5.2`
Selected for capability and API compatibility. The model is configured server-side in the route handler, so swapping it out requires changing one line.

### shadcn/ui + Tailwind CSS v4
shadcn/ui provides accessible, unstyled-by-default components that are copied into the repo rather than imported as a black-box dependency — giving full control over markup. Tailwind v4 drops the config file in favor of CSS-native configuration, reducing project boilerplate.

### Browser `localStorage`
Chosen to eliminate backend infrastructure entirely. There is no database, no server-side session store, and no deployment dependency beyond a static Next.js app. For a single-user demo, localStorage is sufficient and has zero operational overhead.

### `react-markdown`
Renders assistant responses as formatted markdown (code blocks, lists, headers, bold/italic). This is the minimum viable markdown renderer — no plugins, no extensions, just the base package.

---

## Intentionally Omitted

These features were considered and left out deliberately. They are not oversights.

### Authentication
There are no user accounts, login flows, or session tokens. This was omitted because the app is scoped to a single local user. Adding auth would require a backend, a session strategy, a database for user records, and a UI for sign-up/login — none of which add value for a single-user chat tool. If this were multi-tenant, auth would be the first thing added.

### Backend Database
All chat history lives in `localStorage`. A backend database (Postgres, SQLite, etc.) was omitted because it would introduce a deployment dependency, a migration story, and connection management — all significant overhead for a feature that `localStorage` already covers for the target use case. The trade-off is that history is browser-local and not portable across devices or browsers, which is acceptable here.

### Server-Side Rate Limiting
There is no per-IP or per-user rate limiting on the `/api/chat` endpoint. The only protection is a 500ms client-side debounce to prevent accidental double-sends. This was omitted because the app uses a private API key set via environment variable and is not intended to be publicly deployed at scale. Adding rate limiting (e.g., via an edge middleware or Upstash Redis) would be the first hardening step before any public deployment.

### Message Editing and Deletion
Users can clear an entire session but cannot edit or delete individual messages. Editing a past message would require re-running the conversation from that point forward, which adds significant complexity to the state model (forking history, invalidating subsequent messages). For a first version, clearing and restarting is a simpler and predictable escape hatch.

### File Uploads and Attachments
The input is text-only. Multimodal support (images, PDFs, etc.) was omitted because it requires either base64 encoding large payloads into the request body or a separate file upload pipeline with cloud storage. The added complexity is not justified unless there is a concrete use case driving it.

### Export / Backup
There is no way to export chat history. Since everything is in `localStorage`, a browser clear or device switch loses all data. An export feature (JSON, Markdown, PDF) was considered but omitted to keep scope tight. The data is in `localStorage` and is accessible via DevTools for anyone who needs it urgently.

### System Prompt Customization
The assistant's persona is hardcoded in the route handler as a helpful, concise assistant. There is no UI to change the system prompt, adjust tone, or set a persona. This was omitted because it adds surface area (UI, state, persistence) without being a core part of the chat experience. It is the kind of power-user feature that can be added incrementally.

### Token Counting and Cost Visibility
There is no display of token usage, context window consumption, or estimated cost per message. The AI SDK does expose usage metadata in the stream, but surfacing it in the UI was left out to keep the interface uncluttered. This would be useful for debugging or cost-aware usage, but is not essential for basic chat.

### Voice Input
No speech-to-text integration. Adding it would require either the Web Speech API (browser-dependent, unreliable) or a separate transcription endpoint (e.g., Whisper). Text-only keeps the input model simple and the implementation portable.

### Real-Time Collaboration / Sharing
Sessions are local to the browser and cannot be shared. Multi-user or shareable conversations would require a backend with a real-time sync layer (WebSockets, SSE from a persistent store, or a service like Liveblocks). That is a fundamentally different architecture, not an incremental addition.

### Caching and RAG
The API route is stateless — each request sends the full message history. There is no retrieval-augmented generation, no vector database, and no response caching. This keeps the architecture simple and the context window as the sole memory mechanism. For long conversations this will eventually hit token limits, but for the target session lengths that is not a problem in practice.
