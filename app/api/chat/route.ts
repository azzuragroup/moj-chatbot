import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { cookies } from "next/headers";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { INSTRUCTIONS } from "@/lib/prompt";
import { hasOnlyChatRoles } from "@/lib/input";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) {
    return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  }

  let messages: UIMessage[];
  try {
    ({ messages } = await req.json());
    if (!Array.isArray(messages) || messages.length === 0) throw new Error();
    if (!hasOnlyChatRoles(messages)) throw new Error();
  } catch {
    return new Response("Nieprawidłowe zapytanie.", { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;

  if (!apiKey || !modelId) {
    return new Response(
      "Brak konfiguracji serwera: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL w pliku .env.local, a potem uruchom serwer ponownie.",
      { status: 500 },
    );
  }

  const openrouter = createOpenRouter({ apiKey });

  const result = streamText({
    model: openrouter.chat(modelId),
    instructions: INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () =>
        "Nie udało się uzyskać odpowiedzi od modelu. Sprawdź klucz, nazwę modelu i saldo w OpenRouter.",
    }),
  });
}
