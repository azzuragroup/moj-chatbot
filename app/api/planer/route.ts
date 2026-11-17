import { cookies } from "next/headers";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { buildPlannerPlan, otherProduct, plannerRequestSchema } from "@/lib/planner";
import { runWeekDrafts } from "@/lib/agent";

export const maxDuration = 60;

/**
 * Planer social media.
 * - plan: daty, święta i produkty (bez modelu, darmowe),
 * - produkt: „Inny produkt” (bez modelu),
 * - tydzien: szkice LinkedIn + Instagram dla jednego tygodnia (jedno wywołanie modelu).
 */
export async function POST(req: Request) {
  // Najpierw sesja: bez logowania nic nie pobieramy i nie wołamy modelu.
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
  const parsed = plannerRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." }, { status: 400 });
  }
  const body = parsed.data;

  if (body.mode === "plan") {
    return Response.json({ ok: true, plan: await buildPlannerPlan(body.miesiac) });
  }
  if (body.mode === "produkt") {
    const produkt = otherProduct(body.miesiac, body.obecny, body.wyklucz);
    return produkt
      ? Response.json({ ok: true, produkt, przygotowano: new Date().toISOString() })
      : Response.json({ ok: false, message: "Brak innych produktów w katalogu." }, { status: 404 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  if (!apiKey || !modelId) {
    return Response.json(
      { ok: false, message: "Brak konfiguracji serwera: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL." },
      { status: 500 },
    );
  }
  return runWeekDrafts(body.posty, { apiKey, modelId });
}
