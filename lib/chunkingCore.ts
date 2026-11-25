/**
 * Podział dokumentu na fragmenty dla bazy wiedzy.
 * Czysta funkcja bez sieci i bez importów lokalnych (testowana bezpośrednio w Node).
 *
 * Zasady:
 * - jeden akapit (tekst oddzielony pustą linią) = jeden fragment,
 * - krótkich akapitów NIE łączymy,
 * - akapit dłuższy niż MAX_CHUNK znaków dzielimy na granicy zdania.
 */

export const MAX_CHUNK = 800;
export const MAX_TITLE = 200;
export const MAX_CONTENT = 20_000;

/** Zdania: koniec na . ! ? … (także z cudzysłowem/nawiasem), potem odstęp. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…]["”»)\]]?)\s+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Awaryjnie: zdanie dłuższe niż limit tniemy na odstępie przed limitem (albo twardo). */
function splitLongSentence(sentence: string, max: number): string[] {
  const parts: string[] = [];
  let rest = sentence;
  while (rest.length > max) {
    const cut = rest.lastIndexOf(" ", max);
    const at = cut > max / 2 ? cut : max;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/** Długi akapit → kawałki do `max` znaków, cięte między zdaniami. */
function splitLongParagraph(paragraph: string, max: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const sentence of splitSentences(paragraph)) {
    for (const piece of sentence.length > max ? splitLongSentence(sentence, max) : [sentence]) {
      if (!current) current = piece;
      else if (current.length + 1 + piece.length <= max) current += " " + piece;
      else {
        out.push(current);
        current = piece;
      }
    }
  }
  if (current) out.push(current);
  return out;
}

/** Cała treść → lista fragmentów w kolejności z dokumentu. */
export function splitIntoChunks(text: string, max = MAX_CHUNK): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length > max ? splitLongParagraph(p, max) : [p]));
}

/** Sposób dzielenia tekstu na stronie /upload. */
export type SplitMode = "akapity" | "stale";
export const SPLIT_MODES = ["akapity", "stale"] as const;
export const FIXED_SIZE = 300;
export const FIXED_OVERLAP = 50;

/**
 * Stałe kawałki: po `size` znaków, każdy kolejny zaczyna się `overlap` znaków przed końcem
 * poprzedniego (zakładka), żeby zdanie na granicy było w całości w jednym z kawałków.
 */
export function splitFixed(text: string, size = FIXED_SIZE, overlap = FIXED_OVERLAP): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  const step = size - overlap;
  const out: string[] = [];
  for (let start = 0; start < clean.length; start += step) {
    out.push(clean.slice(start, start + size));
    if (start + size >= clean.length) break;
  }
  return out;
}

/** Podział według wybranego sposobu (domyślnie akapity). */
export function splitByMode(text: string, mode: SplitMode = "akapity"): string[] {
  return mode === "stale" ? splitFixed(text) : splitIntoChunks(text);
}

/** Etapy importu dokumentu (pokazywane w formularzu). */
export type ImportStage = "split" | "embed" | "save";

export const STAGE_LABELS: Record<ImportStage, { progress: string; name: string }> = {
  split: { progress: "Dzielę tekst…", name: "dzielenie tekstu" },
  embed: { progress: "Tworzę embeddingi…", name: "tworzenie embeddingów" },
  save: { progress: "Zapisuję…", name: "zapis w bazie" },
};

/** Zrozumiały opis błędu embeddingów i co można zrobić (bez szczegółów technicznych). */
export function embeddingFailure(status: number | undefined, errorName?: string): { message: string; hint: string } {
  const notAdded = " Dokument nie został dodany.";
  if (errorName === "TimeoutError" || errorName === "AbortError")
    return { message: "Model embeddingów nie odpowiedział na czas." + notAdded, hint: "Spróbuj ponownie za chwilę. Przy bardzo długim tekście podziel go na dwa dokumenty." };
  switch (status) {
    case 401:
    case 403:
      return { message: "Dostawca odrzucił klucz API." + notAdded, hint: "Sprawdź OPENROUTER_API_KEY w .env.local (lokalnie) albo w ustawieniach Vercela." };
    case 402:
      return { message: "Brak środków na koncie OpenRouter." + notAdded, hint: "Doładuj konto na openrouter.ai i spróbuj ponownie." };
    case 404:
      return { message: "Nie znaleziono modelu embeddingów." + notAdded, hint: "Sprawdź nazwę modelu w OPENROUTER_EMBEDDING_MODEL." };
    case 429:
      return { message: "Za dużo zapytań do modelu embeddingów." + notAdded, hint: "Odczekaj minutę i spróbuj ponownie." };
    default:
      return { message: "Nie udało się utworzyć embeddingów." + notAdded, hint: "Spróbuj ponownie za chwilę. Jeśli błąd się powtarza, sprawdź status na openrouter.ai." };
  }
}

/** Ten sam tytuł = ta sama nazwa źródła (bez różnicy wielkości liter i odstępów). */
export function sameTitle(a: string, b: string) {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleLowerCase("pl-PL");
  return norm(a) === norm(b);
}

/** Data dodania (wersja) zawsze w czasie polskim – tak samo na serwerze i w przeglądarce. */
export function formatVersion(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Ile fragmentów zwraca wyszukiwanie w bazie wiedzy. */
export const SEARCH_RESULTS = 3;

/**
 * Próg podobieństwa: fragment poniżej NIE liczy się jako źródło (jedno miejsce w kodzie).
 * Dobrany 2026-11-25 na 16 pytaniach (model openai/text-embedding-3-small):
 * - pytania, na które baza ma odpowiedź – najlepszy fragment 0,54–0,73,
 * - pytania spoza bazy (rabat dla szkół, pogoda, biuro, faktury w euro…) – najwyżej 0,43.
 * 0,50 przepuszcza wszystkie trafne fragmenty i odrzuca wszystkie nietrafne.
 * Po zmianie modelu embeddingów próg trzeba dobrać od nowa.
 */
export const MIN_SIMILARITY = 0.5;

type MatchRow = { title?: unknown; content?: unknown; similarity?: unknown };

/**
 * Wiersze z funkcji match_chunks → wynik narzędzia searchKnowledge:
 * tytuł dokumentu (źródło), treść fragmentu i podobieństwo (0–1, 3 miejsca po przecinku).
 * Fragmenty bez embeddingu (podobieństwo puste) i poniżej progu MIN_SIMILARITY są pomijane.
 */
export function toSearchResults(rows: MatchRow[] | null | undefined, minSimilarity = MIN_SIMILARITY) {
  return (rows ?? [])
    .filter((r) => typeof r.similarity === "number" && Number.isFinite(r.similarity) && r.similarity >= minSimilarity)
    .slice(0, SEARCH_RESULTS)
    .map((r) => ({
      tytul: String(r.title ?? ""),
      tresc: String(r.content ?? ""),
      podobienstwo: Math.round((r.similarity as number) * 1000) / 1000,
    }));
}

/** Komunikat po zapisie, z polską odmianą słowa „fragment”. */
export function chunksLabel(n: number) {
  const lastTwo = n % 100;
  const last = n % 10;
  if (n === 1) return "1 fragment";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} fragmenty`;
  return `${n} fragmentów`;
}
