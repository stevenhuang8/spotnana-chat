# createdAt Timestamp Overwrite Bug

## Location

`components/chat/chat-interface.tsx`, line 81

## Problem

Every time streaming completes, the `useEffect` on lines 68–92 builds a fresh `ChatSession` object with `createdAt: Date.now()`. This overwrites the original creation timestamp on every subsequent save, causing the session to appear newly created after each AI response.

## Root Cause

The session object is constructed from scratch on each save rather than merging with the existing stored session. As a result, `createdAt` always receives the current time instead of the original session's creation time.

## Symptoms

After every AI response, the sidebar sorts or displays the session as if it were just created, because the `createdAt` timestamp is reset to the time of the most recent save.

## Fix

When the session already exists (i.e., `activeSessionId` is set), preserve the existing `createdAt` from the stored session:

```ts
// Before (line 81)
createdAt: Date.now(),

// After
createdAt: activeSession?.createdAt ?? Date.now(),
```

This ensures `Date.now()` is only used when creating a brand-new session, and all subsequent saves retain the original creation timestamp.

## Scope

Client-side only. No changes needed to the API route, streaming setup, or `chat-storage.ts`.
