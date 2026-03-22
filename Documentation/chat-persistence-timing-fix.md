# Chat Persistence Timing Fix

## Problem

The most recent AI response was not being saved correctly. In the browser it rendered as an empty `<div>`, and in the chat UI it appeared as an empty bubble.

## Root Cause

The persistence `useEffect` in `components/chat/chat-interface.tsx` used `[messages.length]` as its dependency array. This caused the effect to fire the moment the AI response was added to the messages array — while the message content was still empty (streaming had not yet started or completed). By the time streaming filled in the content, `messages.length` had not changed again, so the save never re-ran with the full response.

## Fix

Change the `useEffect` dependency from `[messages.length]` to `[isLoading]`, and guard with:

```ts
if (isLoading || messages.length === 0) return;
```

This way the save only runs when `isLoading` transitions to `false` — i.e., when streaming has completed and the full response is in memory.

```ts
// Before
useEffect(() => {
  if (messages.length === 0) return;
  // ... save logic
}, [messages.length]);

// After
useEffect(() => {
  if (isLoading || messages.length === 0) return;
  // ... save logic
}, [isLoading]);
```

## Alternatives Considered & Rejected

| Approach | Reason Rejected |
|---|---|
| Dependency `[messages]` | Fires on every streaming token — excessive re-saves, bad performance |
| Patch `message-bubble.tsx` | Wrong layer; rendering is correct, bug is in persistence timing |
| Patch `chat-storage.ts` | Wrong layer; storage logic is correct |

## Scope

The bug is entirely client-side. The API route, streaming setup, `message-bubble.tsx`, and `chat-storage.ts` are all correct and untouched.
