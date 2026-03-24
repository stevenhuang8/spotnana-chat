# Model Upgrade: gpt-4o-mini → gpt-5.2

## What Changed

The model used in `app/api/chat/route.ts` was updated from `gpt-4o-mini` to `gpt-5.2`.

```ts
// Before
model: openai("gpt-4o-mini")

// After
model: openai("gpt-5.2")
```

---

## Model Comparison

| Dimension           | gpt-4o-mini                        | gpt-5.2                                  |
|---------------------|------------------------------------|------------------------------------------|
| **Input cost**      | ~$0.15 / 1M tokens                 | ~$1.25 / 1M tokens (~8x more)            |
| **Output cost**     | ~$0.60 / 1M tokens                 | ~$10 / 1M tokens (~17x more)             |
| **Context window**  | 128k tokens                        | 400k+ tokens                             |
| **Reasoning depth** | Good for simple Q&A                | Strong multi-step and agentic reasoning  |
| **Latency**         | Lower                              | Higher                                   |
| **Structured outputs** | Yes                             | Yes                                      |
| **Tool/function calling** | Yes                         | Yes                                      |

---

## Why gpt-5.2 for Spotnana

[Spotnana](https://www.spotnana.com/) is a corporate travel management platform. Its core workflows — flight and hotel booking, travel policy enforcement, expense compliance, and trip approvals — are meaningfully more demanding than general-purpose chat. Below is the reasoning for each dimension.

### 1. Travel Policy Reasoning

Corporate travel policies are layered and conditional: per diem limits vary by destination, approval chains differ by employee level, preferred vendors change by region, and exceptions require justification. `gpt-4o-mini` handles straightforward lookups well but struggles with multi-condition rules. `gpt-5.2`'s stronger reasoning reduces the risk of misinterpreting policy, which in a corporate setting can mean out-of-policy bookings, failed audits, or reimbursement disputes.

### 2. Context Window for Trip Context

A single corporate trip can involve multiple travelers, multi-leg itineraries, hotel preferences, visa requirements, and historical booking data. A 400k+ token context window means the model can hold all of this in a single request without truncation or summarization loss. With `gpt-4o-mini`'s 128k window, complex itineraries or long policy documents risk being cut off.

### 3. Agentic and Multi-Step Tasks

Spotnana's assistant is likely expected to do more than answer questions — it should search options, apply policy filters, suggest alternatives, and guide users through booking flows. These are sequential, dependent steps where each output informs the next. `gpt-5.2` is explicitly optimized for agentic workflows, reducing errors and hallucinations in chained reasoning.

### 4. Accuracy Over Cost

In consumer chat, a slightly wrong answer is an inconvenience. In corporate travel, a wrong booking costs money, misses compliance requirements, or wastes traveler time. The ~17x output cost increase is significant but justified: a single prevented booking error or policy violation likely offsets thousands of API calls worth of cost difference.

### 5. Cost Mitigation Options

If cost becomes a concern at scale, the following strategies apply without sacrificing quality:
- **Prompt caching** — repeated system prompts (policy documents, company preferences) qualify for cached input pricing (~90% discount on cached tokens).
- **`gpt-5.2-mini` variant** — if available, provides a middle ground between speed/cost and reasoning quality for lower-stakes queries.
- **Tiered routing** — route simple queries (flight status, basic lookups) to a cheaper model and complex ones (policy checks, multi-leg itineraries) to `gpt-5.2`.

---

## What Was Not Changed

- The Vercel AI SDK integration (`streamText`, `useChat`) requires no changes — the model is swapped by changing the string ID only.
- System prompt, message format, and streaming behavior are unchanged.
- No environment variable changes are required beyond ensuring the API key has access to `gpt-5.2`.
