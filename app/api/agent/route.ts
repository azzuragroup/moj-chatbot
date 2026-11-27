import type { UIMessage } from "ai";
import { getCurrentUser, getUserDb } from "@/lib/supabase/server";
import { hasOnlyChatRoles, parseAnalyzeRequest } from "@/lib/input";
import { validateChatFiles } from "@/lib/images";
import { runAnalyze, runChat } from "@/lib/agent";
import { parseConversationId } from "@/lib/chatPersistence";

export const maxDuration = 60;

function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  return apiKey && modelId ? { apiKey, modelId } : null;
}

const CONFIG_MESSAGE =
  "Brak konfiguracji serwera: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL.";

export async function POST(req: Request) {
  // Zweryfikowana sesja Supabase (getClaims) – bez niej 401, zanim dotkniemy bazy albo modelu.
  const user = await getCurrentUser();
  if (!user) {
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
    // req.signal: gdy użytkownik kliknie Stop, przeglądarka zrywa połączenie,
    // a model i narzędzia przestają pracować (nie płacimy za resztę).
    // Rozmowa zapisuje się klientem zalogowanej osoby (jej sesja z ciasteczek) – user_id
    // ustala baza z tej sesji, nigdy z treści zapytania ani od modelu.
    const db = await getUserDb();
    return runChat(db, messages, config, req.signal, parseConversationId(rest.conversationId), user.email);
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
