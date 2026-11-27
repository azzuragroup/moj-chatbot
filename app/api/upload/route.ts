import { z } from "zod";
import { getCurrentUser, getUserDb } from "@/lib/supabase/server";
import { MAX_CONTENT, MAX_TITLE, SPLIT_MODES } from "@/lib/chunkingCore";
import { importDocument } from "@/lib/knowledge";

const requestSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, "Wpisz tytuł dokumentu.")
    .max(MAX_TITLE, `Tytuł może mieć najwyżej ${MAX_TITLE} znaków.`),
  content: z
    .string()
    .trim()
    .min(1, "Wklej treść dokumentu.")
    .max(MAX_CONTENT, `Treść może mieć najwyżej ${MAX_CONTENT.toLocaleString("pl-PL")} znaków.`),
  replace: z.boolean().default(false),
  mode: z.enum(SPLIT_MODES).default("akapity"),
});

/**
 * Import dokumentu do bazy wiedzy. Odpowiedź to strumień linii JSON (NDJSON):
 * najpierw etapy {"stage":"split"|"embed"|"save"}, na końcu wynik {"ok":true,…} albo {"ok":false,…}.
 */
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

  // Dokument zapisuje się klientem zalogowanej osoby – user_id ustala baza z jej sesji.
  const db = await getUserDb();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await importDocument(db, parsed.data, (stage) => send({ stage }));
        send(result);
      } catch (err) {
        console.error("[baza wiedzy] nieoczekiwany błąd importu", err instanceof Error ? err.name : "");
        send({ ok: false, stage: "save", message: "Wystąpił nieoczekiwany błąd serwera.", hint: "Spróbuj ponownie za chwilę." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
