# Input Character Limit

## Problem

A user can paste unlimited text into the textarea. If the combined message
history exceeds OpenAI's token limit (~128k for gpt-4o-mini), the API returns
an error. The user gets an opaque failure with no guidance on why it happened
or how to fix it.

## Solution

Add an 8,000-character cap on the textarea as a conservative proxy for ~2,000
tokens (~4 chars/token). Track the character count in `prompt-input.tsx` with
a live counter displayed below the textarea. Disable the send button and show a
warning when the limit is exceeded. This catches the problem at the input layer
before it ever reaches the API.

## What changes

**`components/chat/prompt-input.tsx`** — all changes are isolated to this file.

1. **`CHAR_LIMIT = 8000` constant** — single source of truth at the top of
   the file; easy to adjust later.

2. **`isOverLimit` derived value** — `input.length > CHAR_LIMIT`, computed
   inline. No state needed.

3. **`handleSubmit` guard** — `isOverLimit` added to the early-return
   condition alongside `isLoading`, so Enter key cannot bypass the disabled
   button.

4. **Character counter below the textarea** — always visible, conditionally
   styled:
   - Under limit: subtle `{count} / 8000` in muted text
   - Over limit: count turns red + warning "Message too long — please shorten
     it before sending"

5. **Send button `disabled` prop** — `isOverLimit` added to the existing
   condition (`!input.trim() || isLoading || isOverLimit`).

6. **No `maxLength` attribute** — silent HTML truncation gives zero feedback;
   the counter + disabled button is the intended mechanism.

## Constraints / No-Gos

| Constraint | Reason |
|---|---|
| No client-side token counting | Tokenizer libraries (e.g. tiktoken-node) add bundle weight for marginal accuracy gain over a char proxy |
| No `maxLength` on `<textarea>` | Silently blocks input with no user feedback |
| No server-side `maxTokens` enforcement | Silences the model mid-response — worse UX than blocking at input |
| No automatic history trimming | Drops context silently; confusing for the user |
| No OpenAI error message surfacing | Not user-friendly; input-layer prevention is cleaner |

## Data flow

```
user types / pastes
  └─ onChange fires → input state updates
       └─ isOverLimit = input.length > 8000
            ├─ false → counter shows muted "N / 8000"
            │          send button enabled (if input non-empty and not loading)
            └─ true  → counter turns red
                       warning text appears
                       send button disabled
                       Enter key no-ops (handleSubmit guard)
```
