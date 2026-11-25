import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Modele OpenRouter w jednym miejscu (tylko serwer – klucz nie trafia do przeglądarki).
 *
 * - Model rozmowy: zmienna OPENROUTER_MODEL.
 * - Model embeddingów: zmienna OPENROUTER_EMBEDDING_MODEL. Ten sam model służy
 *   do zapisu dokumentów w bazie wiedzy i do zamiany pytań na wektory – inaczej
 *   wektory nie dałyby się porównać.
 *
 * Sprawdzone 2026-11-25 (jedno wywołanie dla słowa „test”):
 *   model embeddingów: openai/text-embedding-3-small
 *   długość embeddingu: 1536 liczb → kolumna chunks.embedding to vector(1536)
 * Zmiana modelu embeddingów = inna długość lub inne wektory: trzeba poprawić
 * kolumnę i funkcję match_chunks w Supabase oraz przeliczyć wszystkie dokumenty.
 */

export const EMBEDDING_DIMENSIONS = 1536;

function apiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || null;
}

/** Model rozmowy albo null, gdy brakuje konfiguracji. */
export function getChatModel() {
  const key = apiKey();
  const modelId = process.env.OPENROUTER_MODEL?.trim();
  if (!key || !modelId) return null;
  return createOpenRouter({ apiKey: key }).chat(modelId);
}

/** Model embeddingów albo null, gdy brakuje konfiguracji. */
export function getEmbeddingModel() {
  const key = apiKey();
  const modelId = process.env.OPENROUTER_EMBEDDING_MODEL?.trim();
  if (!key || !modelId) return null;
  return createOpenRouter({ apiKey: key }).textEmbeddingModel(modelId);
}
