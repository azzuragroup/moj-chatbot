import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { deleteDocument, listDocuments } from "@/lib/knowledge";

async function signedIn() {
  return hasValidSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Lista dokumentów bazy wiedzy (tytuł, data dodania, liczba fragmentów). */
export async function GET() {
  // Najpierw sesja: bez logowania nie czytamy bazy.
  if (!(await signedIn())) return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  const documents = await listDocuments();
  if (!documents) return Response.json({ ok: false, message: "Nie udało się wczytać listy dokumentów." }, { status: 500 });
  return Response.json({ ok: true, documents });
}

const deleteSchema = z.strictObject({ mode: z.literal("delete"), id: z.number().int().positive() });

/** Usunięcie dokumentu razem z fragmentami. */
export async function POST(req: Request) {
  if (!(await signedIn())) return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, message: "Nieprawidłowe zapytanie." }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, message: "Nieprawidłowe dane." }, { status: 400 });

  const result = await deleteDocument(parsed.data.id);
  if (!result.ok) return Response.json({ ok: false, message: "Nie udało się usunąć dokumentu. Spróbuj ponownie." }, { status: 500 });
  if (result.deleted === 0) return Response.json({ ok: false, message: "Tego dokumentu już nie ma w bazie." }, { status: 404 });
  return Response.json({ ok: true });
}
