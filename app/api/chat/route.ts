import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response("Missing or invalid messages", { status: 400 });
  }

  // convertToModelMessages transforms the UI message format (with parts[])
  // sent by DefaultChatTransport into the model message format that OpenAI expects.
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system:
      "You are a helpful, concise assistant. Answer clearly and accurately. Use markdown formatting where appropriate.",
    messages: modelMessages,
  });

  // toUIMessageStreamResponse streams tokens back in the format useChat expects.
  return result.toUIMessageStreamResponse();
}
