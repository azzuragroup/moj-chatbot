import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { deleteConversation } from "@/lib/chatStore";

const requestSchema = z.strictObject({
  mode: z.literal("delete"),
  id: z.number().int().positive(),
});

/** Historia rozmów: usuwanie rozmowy (razem z wiadomościami). */
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
    return Response.json({ ok: false, message: "Nieprawidłowy numer rozmowy." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return Response.json({ ok: false, message: "Zapis rozmów jest wyłączony na serwerze." }, { status: 500 });
  }
  const deleted = await deleteConversation(parsed.data.id);
  return deleted
    ? Response.json({ ok: true })
    : Response.json({ ok: false, message: "Nie udało się usunąć rozmowy (może już jej nie ma)." }, { status: 404 });
}
