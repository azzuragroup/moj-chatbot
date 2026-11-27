import { z } from "zod";
import { getCurrentUser, getUserDb } from "@/lib/supabase/server";
import { deleteConversation } from "@/lib/chatStore";

const requestSchema = z.strictObject({
  mode: z.literal("delete"),
  id: z.number().int().positive(),
});

/** Historia rozmów: usuwanie rozmowy (razem z wiadomościami). */
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
    return Response.json({ ok: false, message: "Nieprawidłowy numer rozmowy." }, { status: 400 });
  }
  // Klient zalogowanej osoby: RLS pozwala usunąć tylko jej własną rozmowę.
  const db = await getUserDb();
  if (!db) {
    return Response.json({ ok: false, message: "Zapis rozmów jest wyłączony na serwerze." }, { status: 500 });
  }
  const deleted = await deleteConversation(db, parsed.data.id);
  return deleted
    ? Response.json({ ok: true })
    : Response.json({ ok: false, message: "Nie udało się usunąć rozmowy (może już jej nie ma)." }, { status: 404 });
}
