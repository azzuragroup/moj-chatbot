import { z } from "zod";
import { getCurrentUser, getUserDb } from "@/lib/supabase/server";
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

/** Profil zalogowanej osoby: poprawianie, usuwanie pozycji i czyszczenie (zawsze jej własny wiersz). */
export async function POST(req: Request) {
  // Zweryfikowana sesja Supabase (getClaims) – bez niej 401, zanim dotkniemy bazy albo modelu.
  if (!(await getCurrentUser())) {
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
  // Własny profil zalogowanej osoby (RLS); user_id nie jest przyjmowany z przeglądarki.
  const db = await getUserDb();
  const result =
    body.mode === "clear"
      ? await replaceProfile(db, { name: null, preferences: {} })
      : await replaceProfile(db, { name: body.name || null, preferences: body.preferences });
  if (!result.ok) return Response.json({ ok: false, message: result.blad }, { status: 500 });
  return Response.json({ ok: true, profile: result.profile, odrzucone: result.rejected });
}
