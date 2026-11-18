import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { replaceProfile } from "@/lib/profile";
import { MAX_KEY, MAX_NAME, MAX_VALUE, MAX_FACTS } from "@/lib/profileCore";

const requestSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    mode: z.literal("save"),
    name: z.string().trim().max(MAX_NAME).nullable(),
    preferences: z
      .record(z.string().trim().min(1).max(MAX_KEY), z.string().trim().min(1).max(MAX_VALUE))
      .refine((p) => Object.keys(p).length <= MAX_FACTS, `Najwyżej ${MAX_FACTS} pozycji.`),
  }),
  z.strictObject({ mode: z.literal("clear") }),
]);

/** Profil użytkownika: poprawianie, usuwanie pozycji i czyszczenie (zawsze ten sam wiersz). */
export async function POST(req: Request) {
  // Najpierw sesja: bez logowania nie dotykamy bazy.
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
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." }, { status: 400 });
  }
  const body = parsed.data;
  const result =
    body.mode === "clear"
      ? await replaceProfile({ name: null, preferences: {} })
      : await replaceProfile({ name: body.name || null, preferences: body.preferences });
  if (!result.ok) return Response.json({ ok: false, message: result.blad }, { status: 500 });
  return Response.json({ ok: true, profile: result.profile, odrzucone: result.rejected });
}
