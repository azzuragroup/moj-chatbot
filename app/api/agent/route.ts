import type { UIMessage } from "ai";
import { cookies } from "next/headers";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { hasOnlyChatRoles, parseAnalyzeRequest } from "@/lib/input";
import { validateChatFiles } from "@/lib/images";
import { runAnalyze, runChat } from "@/lib/agent";

export const maxDuration = 60;

function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  return apiKey && modelId ? { apiKey, modelId } : null;
}

const CONFIG_MESSAGE =
  "Brak konfiguracji serwera: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL.";

export async function POST(req: Request) {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) {
    return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    const json = await req.json();
    if (json && typeof json === "object" && !Array.isArray(json)) body = json;
  } catch {}
  if (!body) return new Response("Nieprawidłowe zapytanie.", { status: 400 });

  const { mode, ...rest } = body;

  if (mode === "chat") {
    const messages = rest.messages as UIMessage[];
    if (!Array.isArray(messages) || messages.length === 0 || !hasOnlyChatRoles(messages)) {
      return new Response("Nieprawidłowe zapytanie.", { status: 400 });
    }
    const fileError = validateChatFiles(messages);
    if (fileError) return new Response(fileError, { status: 400 });
    const config = getConfig();
    if (!config) return new Response(CONFIG_MESSAGE, { status: 500 });
    return runChat(messages, config);
  }

  if (mode === "analyze") {
    const request = parseAnalyzeRequest(rest);
    if (!request.ok) return new Response(request.error, { status: 400 });
    const config = getConfig();
    if (!config) {
      return Response.json(
        { ok: false, kind: "config", message: CONFIG_MESSAGE, issues: [] },
        { status: 503 },
      );
    }
    return runAnalyze(request.message, config);
  }

  return new Response('Nieznany tryb. Użyj mode "chat" albo "analyze".', { status: 400 });
}
