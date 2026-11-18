/**
 * Zamiana wiadomości czatu na tekst do bazy i z powrotem.
 * Czyste funkcje bez sieci i bez importów lokalnych (testowane bezpośrednio w Node).
 */

export const MAX_STORED_CHARS = 20_000;
export const IMAGE_PLACEHOLDER = "[obraz]";
export const STOPPED_NOTE = "[Przerwane przez użytkownika]";

type Part = {
  type: string;
  text?: string;
  mediaType?: string;
  state?: string;
  output?: unknown;
};
type MessageLike = { role: string; parts: Part[] };

export type StoredRow = { id: number; role: string; content: string; created_at?: string };

const okOutput = (p: Part) =>
  p.state === "output-available" && typeof p.output === "object" && p.output !== null && (p.output as { ok?: unknown }).ok === true;

/**
 * Tekst wiadomości do zapisania. Obrazy (zdjęcia użytkownika, wygenerowane grafiki,
 * grafika posta na Instagram) nie trafiają do bazy – zamiast nich „[obraz]”.
 */
export function messageToText(message: MessageLike, { aborted = false } = {}) {
  const pieces: string[] = [];
  for (const p of message.parts) {
    if (p.type === "text" && p.text?.trim()) pieces.push(p.text.trim());
    else if (p.type === "file" && p.mediaType?.startsWith("image/")) pieces.push(IMAGE_PLACEHOLDER);
    else if (p.type === "tool-generujObraz" && okOutput(p)) pieces.push(IMAGE_PLACEHOLDER);
    else if (p.type === "tool-postInstagram" && okOutput(p)) {
      const post = p.output as { opis?: string; hashtagi?: string[] };
      const caption = [post.opis, (post.hashtagi ?? []).join(" ")].filter(Boolean).join("\n");
      pieces.push(caption ? `${IMAGE_PLACEHOLDER} Post na Instagram:\n${caption}` : IMAGE_PLACEHOLDER);
    }
  }
  let text = pieces.join("\n\n");
  if (aborted) text = text ? `${text}\n\n${STOPPED_NOTE}` : STOPPED_NOTE;
  return text.slice(0, MAX_STORED_CHARS);
}

/** Tytuł rozmowy: początek pierwszej wiadomości (do 60 znaków, bez urywania słowa). */
export function titleFromText(text: string, max = 60) {
  const clean = text.replace(/\s+/g, " ").trim() || "Nowa rozmowa";
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 20 ? cut.slice(0, space) : cut).trim()}…`;
}

/** Wiersze z bazy → wiadomości dla czatu (w kolejności zapisu). */
export function rowsToMessages(rows: StoredRow[]) {
  return [...rows]
    .filter((r) => (r.role === "user" || r.role === "assistant") && r.content)
    .sort((a, b) => a.id - b.id)
    .map((r) => ({
      id: `db-${r.id}`,
      role: r.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: r.content }],
    }));
}

/** Numer rozmowy z zapytania: dodatnia liczba całkowita albo null (nowa rozmowa). */
export function parseConversationId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d{1,15}$/.test(value) && Number(value) > 0) return Number(value);
  return null;
}

/** „1 wiadomość”, „0/2/5/12 wiadomości” (po polsku liczba mnoga ma tu jedną formę). */
export function messagesLabel(count: number) {
  return count === 1 ? "1 wiadomość" : `${count} wiadomości`;
}

/**
 * Porządkuje tytuł od modelu: bez cudzysłowów, kropki na końcu i znaczników,
 * najwyżej 5 słów i 60 znaków. Pusty wynik → null (zostaje dotychczasowy tytuł).
 */
export function cleanTitle(raw: string) {
  const firstLine = raw.split("\n").find((l) => l.trim()) ?? "";
  const text = firstLine
    .replace(/^\s*(tytuł|title)\s*:\s*/i, "")
    .replace(/[*_#`]/g, "")
    .replace(/^["'„“”«»\s]+/g, "")
    .replace(/["'„“”«».!?…:;,\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  const words = text.split(" ").slice(0, 5).join(" ");
  return words.slice(0, 60).trim() || null;
}
