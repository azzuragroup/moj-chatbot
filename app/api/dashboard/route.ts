import { cookies } from "next/headers";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { buildTravelCards, travelRequestSchema } from "@/lib/travel";

export const maxDuration = 30;

/** Karty podróży: pogoda, waluta, święta, Wikipedia, czas. Bez modelu – nic nie kosztuje. */
export async function POST(req: Request) {
  // Najpierw sesja: bez logowania nic nie pobieramy.
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) {
    return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, blad: "Nieprawidłowe zapytanie." }, { status: 400 });
  }
  const parsed = travelRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, blad: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." }, { status: 400 });
  }
  const result = await buildTravelCards(parsed.data.miasto, parsed.data.data);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
