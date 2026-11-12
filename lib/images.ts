import { z } from "zod";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGES_PER_MESSAGE = 4;
export const MAX_IMAGE_PROMPT_LENGTH = 500;

type Part = { type?: unknown; mediaType?: unknown; url?: unknown };
type Message = { role?: unknown; parts?: unknown };

/** Rozmiar danych zapisanych w base64 (bez nagłówka data:). */
function base64Bytes(data: string) {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
}

/**
 * Sprawdza zdjęcia w wiadomościach czatu. Przyjmujemy tylko zdjęcia od
 * użytkownika, jako dane w adresie data: (bez linków do cudzych serwerów),
 * w dozwolonych formatach i do 4 MB. Zwraca komunikat błędu albo null.
 */
export function validateChatFiles(messages: Message[]): string | null {
  for (const m of messages) {
    if (!Array.isArray(m.parts)) continue;
    const files = (m.parts as Part[]).filter((p) => p?.type === "file");
    if (files.length === 0) continue;
    if (m.role !== "user") return "Zdjęcia mogą pochodzić tylko od użytkownika.";
    if (files.length > MAX_IMAGES_PER_MESSAGE) {
      return `Możesz dodać najwyżej ${MAX_IMAGES_PER_MESSAGE} zdjęcia do jednej wiadomości.`;
    }
    for (const f of files) {
      const type = String(f.mediaType ?? "");
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)) {
        return "Dozwolone są tylko zdjęcia JPG, PNG i WEBP.";
      }
      const url = typeof f.url === "string" ? f.url : "";
      const prefix = `data:${type};base64,`;
      if (!url.startsWith(prefix)) return "Zdjęcie musi być wysłane z Twojego urządzenia.";
      if (base64Bytes(url.slice(prefix.length)) > MAX_IMAGE_BYTES) {
        return "Zdjęcie jest większe niż 4 MB.";
      }
    }
  }
  return null;
}

const imageRequestSchema = z.strictObject({
  prompt: z.string().trim().min(1).max(MAX_IMAGE_PROMPT_LENGTH),
});

export function parseImageRequest(
  body: unknown,
): { ok: true; prompt: string } | { ok: false; error: string } {
  const parsed = imageRequestSchema.safeParse(body);
  if (parsed.success) return { ok: true, prompt: parsed.data.prompt };
  if (parsed.error.issues.some((i) => i.code === "too_big")) {
    return { ok: false, error: `Opis obrazu może mieć najwyżej ${MAX_IMAGE_PROMPT_LENGTH} znaków.` };
  }
  if (parsed.error.issues.some((i) => i.code === "unrecognized_keys")) {
    return { ok: false, error: "Niedozwolone pole w zapytaniu." };
  }
  return { ok: false, error: "Wpisz opis obrazu." };
}

/** Zrozumiały komunikat po polsku dla błędu dostawcy modelu. */
export function describeModelError(
  statusCode: number | undefined,
  message: string | undefined,
  kind: "chat" | "image",
): string {
  const text = (message ?? "").toLowerCase();
  const unavailable =
    kind === "image"
      ? "Model obrazów jest teraz niedostępny. Spróbuj ponownie za chwilę."
      : "Model jest teraz niedostępny. Spróbuj ponownie za chwilę.";
  if (
    kind === "chat" &&
    (text.includes("image") || text.includes("vision") || text.includes("modalit"))
  ) {
    return "Ustawiony model nie obsługuje zdjęć. Wybierz w OPENROUTER_MODEL model z obsługą obrazów (uzgodnij koszt).";
  }
  if (statusCode === 400) {
    return kind === "image"
      ? "Dostawca odrzucił to zlecenie obrazu (np. opis lub ustawienia formatu). Zmień opis i spróbuj ponownie."
      : "Dostawca odrzucił to zapytanie. Zmień treść i spróbuj ponownie.";
  }
  if (statusCode === 401) return "Dostawca odrzucił klucz API. Sprawdź OPENROUTER_API_KEY.";
  if (statusCode === 402) return "Brak środków na koncie OpenRouter.";
  if (statusCode === 403) return "Ta treść została zablokowana przez dostawcę modelu.";
  if (statusCode === 404 || text.includes("no endpoints") || text.includes("not found")) {
    return unavailable;
  }
  if (statusCode === 429) return "Za dużo zapytań. Spróbuj ponownie za chwilę.";
  return unavailable;
}

/** Model zgłoszony w treści odpowiedzi API (pole "model"), jeśli jest. */
export function reportedModel(body: unknown): string | undefined {
  if (body && typeof body === "object" && "model" in body) {
    const model = (body as { model: unknown }).model;
    if (typeof model === "string" && model.trim()) return model;
  }
  return undefined;
}

/** Identyfikator wywołania OpenRouter (gen-…) z nagłówka albo z treści odpowiedzi. */
export function generationIdFrom(
  headers: { get(name: string): string | null },
  body: unknown,
): string | undefined {
  const fromHeader = headers.get("x-generation-id");
  if (fromHeader?.startsWith("gen-")) return fromHeader;
  if (body && typeof body === "object" && "id" in body) {
    const id = (body as { id: unknown }).id;
    if (typeof id === "string" && id.startsWith("gen-")) return id;
  }
  return undefined;
}

/** Model z odpowiedzi endpointu statystyk /api/v1/generation. */
export function modelFromGenerationStats(body: unknown): string | undefined {
  if (body && typeof body === "object" && "data" in body) {
    return reportedModel((body as { data: unknown }).data);
  }
  return undefined;
}

export type ImageResult =
  | {
      ok: true;
      url: string;
      mediaType: string;
      modelId: string | null;
      provider: string | null;
      brand: string;
    }
  | { ok: false; message: string };

/** Tekst, który model dostaje zamiast pliku obrazu. */
export function imageToolModelText(output: ImageResult) {
  return output.ok ? "obraz wygenerowany" : `nie udało się wygenerować obrazu: ${output.message}`;
}

/** Opis narzędzia generujObraz bez wywołania modelu (execute dokłada lib/imageGen). */
export const imageToolSpec = {
  description:
    "Generuje obraz (grafikę, ilustrację, logo, baner) w stylu marki Azzura Group na podstawie opisu. " +
    "Użyj, gdy użytkownik prosi o wygenerowanie, narysowanie lub stworzenie obrazu. " +
    "Opis przekaż po polsku, konkretnie i bez zmieniania sensu prośby.",
  inputSchema: z.object({
    opis: z.string().min(1).max(MAX_IMAGE_PROMPT_LENGTH).describe("Opis obrazu do wygenerowania."),
  }),
  toModelOutput: ({ output }: { output: ImageResult }) => ({
    type: "text" as const,
    value: imageToolModelText(output),
  }),
};
