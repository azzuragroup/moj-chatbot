import { cookies } from "next/headers";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { cardsToPrompt, summaryRequestSchema } from "@/lib/travel";
import { runTravelSummary } from "@/lib/agent";

export const maxDuration = 30;

/** Podsumowanie od agenta (2–3 zdania) na podstawie danych z kart. Płatne wywołanie modelu. */
export async function POST(req: Request) {
  // Najpierw sesja: bez logowania model nie jest wywoływany.
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) {
    return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, message: "Nieprawidłowe zapytanie." }, { status: 400 });
  }
  const parsed = summaryRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Nieprawidłowe dane kart." }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  if (!apiKey || !modelId) {
    return Response.json(
      { ok: false, message: "Brak konfiguracji serwera: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL." },
      { status: 500 },
    );
  }
  return runTravelSummary(cardsToPrompt(parsed.data), { apiKey, modelId });
}
