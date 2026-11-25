import "server-only";
import { embed, embedMany, tool } from "ai";
import { z } from "zod";
import { getSupabase } from "./supabase";
import { EMBEDDING_DIMENSIONS, getEmbeddingModel } from "./model";
import {
  MIN_SIMILARITY,
  SEARCH_RESULTS,
  embeddingFailure,
  sameTitle,
  splitByMode,
  toSearchResults,
  type ImportStage,
  type SplitMode,
} from "./chunkingCore";

/**
 * Baza wiedzy: dokumenty (tabela documents) i ich fragmenty z embeddingami (tabela chunks).
 *
 * Etapy importu (każdy zgłaszany przez onStage, żeby formularz pokazał postęp):
 * 1. split – dzielimy tekst na fragmenty,
 * 2. embed – liczymy embeddingi nowych fragmentów i starszych z pustą kolumną (jedno embedMany),
 * 3. save  – zapisujemy nowy dokument z fragmentami, usuwamy poprzednie wersje o tym samym
 *            tytule i uzupełniamy starsze fragmenty.
 * Nowa wersja powstaje, zanim stara zniknie – nieudany import nie kasuje poprzedniej wersji.
 */

/** Ile starszych fragmentów bez embeddingu uzupełniamy przy jednym imporcie. */
const BACKFILL_LIMIT = 200;
const EMBED_TIMEOUT_MS = 30_000;

export type KnowledgeDocument = { id: number; title: string; createdAt: string; chunks: number };

export type ImportFailure = { ok: false; stage: ImportStage; message: string; hint: string; exists?: boolean };
export type ImportSuccess = {
  ok: true;
  id: number;
  title: string;
  chunks: number;
  replaced: number;
  uzupelniono: number;
  nieUzupelniono: number;
  warning?: string;
};

/** Lista dokumentów: tytuł (źródło), data dodania (wersja), liczba fragmentów. */
export async function listDocuments(): Promise<KnowledgeDocument[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("documents")
    .select("id, title, created_at, chunks(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[baza wiedzy] nie udało się wczytać listy dokumentów", error.code, error.message);
    return null;
  }
  return (data ?? []).map((row) => ({
    id: row.id as number,
    title: row.title as string,
    createdAt: row.created_at as string,
    chunks: ((row.chunks as { count: number }[] | null)?.[0]?.count ?? 0) as number,
  }));
}

/** Usuwa dokument (jego fragmenty kasuje ON DELETE CASCADE). Zwraca, czy coś usunięto. */
export async function deleteDocument(id: number): Promise<{ ok: boolean; deleted: number }> {
  const db = getSupabase();
  if (!db) return { ok: false, deleted: 0 };
  const { error, count } = await db.from("documents").delete({ count: "exact" }).eq("id", id);
  if (error) {
    console.error("[baza wiedzy] nie udało się usunąć dokumentu", id, error.code, error.message);
    return { ok: false, deleted: 0 };
  }
  return { ok: true, deleted: count ?? 0 };
}

const fail = (stage: ImportStage, message: string, hint: string, extra: Partial<ImportFailure> = {}): ImportFailure => ({
  ok: false,
  stage,
  message,
  hint,
  ...extra,
});

const SAVE_HINT = "Spróbuj ponownie za chwilę. Jeśli błąd się powtarza, sprawdź, czy projekt w Supabase działa.";

export async function importDocument(
  input: { title: string; content: string; replace: boolean; mode?: SplitMode },
  onStage: (stage: ImportStage) => void = () => {},
): Promise<ImportFailure | ImportSuccess> {
  const db = getSupabase();
  if (!db) return fail("split", "Baza wiedzy jest wyłączona – brak konfiguracji bazy na serwerze.", "Uzupełnij SUPABASE_URL i SUPABASE_SECRET_KEY.");
  const model = getEmbeddingModel();
  if (!model) {
    return fail("split", "Brak konfiguracji modelu embeddingów na serwerze.", "Uzupełnij OPENROUTER_EMBEDDING_MODEL i OPENROUTER_API_KEY.");
  }

  // 1. Dzielenie tekstu
  onStage("split");
  const chunks = splitByMode(input.content, input.mode);
  if (chunks.length === 0) return fail("split", "Treść nie zawiera tekstu.", "Wklej treść dokumentu i spróbuj ponownie.");

  // Poprzednie wersje o tym samym tytule (bez rozróżniania wielkości liter i odstępów).
  const { data: all, error: listError } = await db.from("documents").select("id, title");
  if (listError) {
    console.error("[baza wiedzy] nie udało się sprawdzić tytułów", listError.code, listError.message);
    return fail("split", "Nie udało się sprawdzić, czy dokument o tym tytule już istnieje.", SAVE_HINT);
  }
  const oldVersions = (all ?? []).filter((d) => sameTitle(d.title as string, input.title)).map((d) => d.id as number);
  if (oldVersions.length > 0 && !input.replace) {
    return fail("split", `Dokument „${input.title}” już jest w bazie.`, "Potwierdź zastąpienie albo zmień tytuł.", { exists: true });
  }

  // 2. Embeddingi: nowe fragmenty + starsze z pustą kolumną, jedno wywołanie modelu.
  onStage("embed");
  const { data: missing, error: missingError } = await db
    .from("chunks")
    .select("id, document_id, content")
    .is("embedding", null)
    .order("id", { ascending: true })
    .limit(BACKFILL_LIMIT);
  if (missingError) {
    console.error("[baza wiedzy] nie udało się odczytać fragmentów bez embeddingu", missingError.code, missingError.message);
  }
  // Fragmentów starych wersji, które zaraz znikną, nie liczymy.
  const backfill = ((missing ?? []) as { id: number; document_id: number; content: string }[]).filter(
    (c) => !oldVersions.includes(c.document_id),
  );

  let embeddings: number[][];
  try {
    const result = await embedMany({
      model,
      values: [...chunks, ...backfill.map((c) => c.content)],
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });
    embeddings = result.embeddings;
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    const name = err instanceof Error ? err.name : undefined;
    console.error("[baza wiedzy] embeddingi nie powiodły się", status ?? "", name ?? "");
    const f = embeddingFailure(status, name);
    return fail("embed", f.message, f.hint);
  }
  const expected = chunks.length + backfill.length;
  if (embeddings.length !== expected || embeddings.some((e) => e.length !== EMBEDDING_DIMENSIONS)) {
    console.error("[baza wiedzy] zła liczba lub długość embeddingów", embeddings.length, expected, embeddings[0]?.length);
    return fail(
      "embed",
      `Model embeddingów zwrócił nieoczekiwany wynik (oczekiwano ${EMBEDDING_DIMENSIONS} liczb na fragment).`,
      "Sprawdź, czy OPENROUTER_EMBEDDING_MODEL to ten sam model co przy zakładaniu bazy (openai/text-embedding-3-small).",
    );
  }

  // 3. Zapis
  onStage("save");
  const { data: doc, error: docError } = await db.from("documents").insert({ title: input.title }).select("id").single();
  if (docError || !doc) {
    console.error("[baza wiedzy] nie udało się zapisać dokumentu", docError?.code, docError?.message);
    return fail("save", "Nie udało się zapisać dokumentu w bazie.", SAVE_HINT);
  }
  const documentId = doc.id as number;
  const rows = chunks.map((text, i) => ({ document_id: documentId, chunk_index: i, content: text, embedding: embeddings[i] }));
  const { error: chunksError } = await db.from("chunks").insert(rows);
  if (chunksError) {
    console.error("[baza wiedzy] nie udało się zapisać fragmentów", chunksError.code, chunksError.message);
    await deleteDocument(documentId); // sprzątanie niedokończonego dokumentu
    return fail(
      "save",
      "Nie udało się zapisać fragmentów, więc dokument nie został dodany.",
      oldVersions.length ? "Poprzednia wersja została bez zmian. " + SAVE_HINT : SAVE_HINT,
    );
  }

  // Nowa wersja jest kompletna – dopiero teraz usuwamy poprzednie.
  let replaced = 0;
  let warning: string | undefined;
  if (oldVersions.length) {
    const { error, count } = await db.from("documents").delete({ count: "exact" }).in("id", oldVersions);
    if (error) {
      console.error("[baza wiedzy] nie udało się usunąć poprzedniej wersji", error.code, error.message);
      warning = "Nowa wersja jest zapisana, ale nie udało się usunąć poprzedniej. Usuń ją ręcznie z listy poniżej.";
    } else replaced = count ?? oldVersions.length;
  }

  // Uzupełnienie starszych fragmentów (te z usuniętych wersji już nie istnieją – update ich nie znajdzie).
  const updates = await Promise.all(
    backfill.map((c, i) =>
      db
        .from("chunks")
        .update({ embedding: embeddings[chunks.length + i] }, { count: "exact" })
        .eq("id", c.id)
        .then(({ error, count }) => {
          if (error) console.error("[baza wiedzy] nie udało się uzupełnić fragmentu", c.id, error.code, error.message);
          return error ? "blad" : count ? "ok" : "brak";
        }),
    ),
  );

  return {
    ok: true,
    id: documentId,
    title: input.title,
    chunks: chunks.length,
    replaced,
    uzupelniono: updates.filter((u) => u === "ok").length,
    nieUzupelniono: updates.filter((u) => u === "blad").length,
    warning,
  };
}

/**
 * Narzędzie agenta: wyszukiwanie w bazie wiedzy. Pytanie → embedding (ten sam model co przy
 * imporcie) → funkcja match_chunks w Supabase → 3 najlepiej pasujące fragmenty.
 * Działa tylko w endpoincie czatu, który najpierw sprawdza sesję.
 */
export const searchKnowledge = tool({
  description:
    "Wyszukuje w bazie wiedzy Azzura Group (dokumenty dodane przez pracowników: oferta, cennik, " +
    "zasady, regulamin, informacje o firmie). Używaj przy KAŻDYM pytaniu o firmę, ofertę, ceny, " +
    "zasady i regulamin – zanim odpowiesz. Zwraca do 3 najlepiej pasujących fragmentów (tylko powyżej " +
    "progu podobieństwa): tytuł dokumentu, treść fragmentu i podobieństwo (0–1). Pusta lista = brak " +
    "informacji w bazie. Fragment na podobny temat nie musi zawierać odpowiedzi.",
  inputSchema: z.object({
    pytanie: z
      .string()
      .trim()
      .min(2)
      .max(500)
      .describe("Pytanie użytkownika albo jego sedno, np. „ile kosztuje najtańszy pakiet”."),
  }),
  execute: async ({ pytanie }, { abortSignal }) => {
    const pobrano = new Date().toISOString();
    const db = getSupabase();
    const model = getEmbeddingModel();
    if (!db || !model) return { blad: "Baza wiedzy jest niedostępna – brak konfiguracji na serwerze.", pobrano };

    let embedding: number[];
    try {
      ({ embedding } = await embed({ model, value: pytanie, maxRetries: 1, abortSignal }));
    } catch (err) {
      console.error("[baza wiedzy] embedding pytania nie powiódł się", (err as { statusCode?: number })?.statusCode ?? "");
      return { blad: "Nie udało się przeszukać bazy wiedzy (model embeddingów nie odpowiada).", pobrano };
    }

    const { data, error } = await db.rpc("match_chunks", { query_embedding: embedding, match_count: SEARCH_RESULTS });
    if (error) {
      console.error("[baza wiedzy] match_chunks nie powiodło się", error.code, error.message);
      return { blad: "Nie udało się przeszukać bazy wiedzy (błąd bazy danych).", pobrano };
    }
    const rows = (data ?? []) as { title: string; content: string; similarity: number | null }[];
    const fragmenty = toSearchResults(rows);
    if (fragmenty.length) return { fragmenty, pobrano };
    return {
      fragmenty,
      uwaga: rows.length
        ? `Żaden fragment nie przekroczył progu podobieństwa ${Math.round(MIN_SIMILARITY * 100)}% – w bazie wiedzy nie ma odpowiedzi na to pytanie.`
        : "Baza wiedzy jest pusta albo nie ma w niej fragmentów z embeddingami.",
      pobrano,
    };
  },
});
