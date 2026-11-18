import "server-only";
import { getSupabase } from "./supabase";
import { rowsToMessages, titleFromText, type StoredRow } from "./chatPersistence";

/**
 * Zapis i odczyt rozmów w Supabase. Wołane wyłącznie z kodu serwera,
 * po sprawdzeniu sesji (trasa API albo strona serwerowa).
 * Każda funkcja zwraca null/false przy braku konfiguracji lub błędzie bazy –
 * czat działa wtedy dalej, tylko bez zapisu.
 */

export async function createConversation(firstText: string): Promise<number | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("conversations")
    .insert({ title: titleFromText(firstText) })
    .select("id")
    .single();
  if (error) {
    console.error("[baza] nie udało się utworzyć rozmowy", error.code, error.message);
    return null;
  }
  return data.id as number;
}

export async function conversationExists(id: number): Promise<boolean> {
  const db = getSupabase();
  if (!db) return false;
  const { data, error } = await db.from("conversations").select("id").eq("id", id).maybeSingle();
  if (error) console.error("[baza] nie udało się sprawdzić rozmowy", error.code, error.message);
  return Boolean(data);
}

/** Zapisuje parę: pytanie użytkownika i odpowiedź agenta – jednym zapytaniem, w tej kolejności. */
export async function saveExchange(conversationId: number, userText: string, assistantText: string) {
  const db = getSupabase();
  if (!db) return false;
  const rows = [
    ...(userText ? [{ conversation_id: conversationId, role: "user", content: userText }] : []),
    ...(assistantText ? [{ conversation_id: conversationId, role: "assistant", content: assistantText }] : []),
  ];
  if (rows.length === 0) return true;
  const { error } = await db.from("messages").insert(rows);
  if (error) {
    console.error("[baza] nie udało się zapisać wiadomości", error.code, error.message);
    return false;
  }
  return true;
}

/** Usuwa rozmowę, która nie ma żadnej wiadomości (np. gdy model zwrócił błąd). */
export async function deleteIfEmpty(conversationId: number) {
  const db = getSupabase();
  if (!db) return;
  const { count } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  if (count === 0) await db.from("conversations").delete().eq("id", conversationId);
}

/** Ostatnia rozmowa (najnowsza) z wiadomościami – do pokazania po odświeżeniu strony. */
export async function loadLatestConversation() {
  const db = getSupabase();
  if (!db) return null;
  const { data: conv, error } = await db
    .from("conversations")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[baza] nie udało się wczytać rozmowy", error.code, error.message);
    return null;
  }
  if (!conv) return null;
  return loadConversation(conv.id as number);
}

export async function loadConversation(id: number) {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", id)
    .order("id", { ascending: true });
  if (error) {
    console.error("[baza] nie udało się wczytać wiadomości", error.code, error.message);
    return null;
  }
  return { id, messages: rowsToMessages((data ?? []) as StoredRow[]) };
}

export type ConversationSummary = { id: number; title: string; createdAt: string; messageCount: number };

/** Lista rozmów (najnowsze na górze) z liczbą wiadomości – do strony /history. */
export async function listConversations(limit = 100): Promise<ConversationSummary[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("conversations")
    .select("id, title, created_at, messages(count)")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[baza] nie udało się wczytać listy rozmów", error.code, error.message);
    return null;
  }
  return (data ?? []).map((row) => ({
    id: row.id as number,
    title: (row.title as string | null) || "Rozmowa bez tytułu",
    createdAt: row.created_at as string,
    messageCount: ((row.messages as { count: number }[] | null)?.[0]?.count ?? 0) as number,
  }));
}

export async function updateConversationTitle(id: number, title: string) {
  const db = getSupabase();
  if (!db) return false;
  const { error } = await db.from("conversations").update({ title }).eq("id", id);
  if (error) console.error("[baza] nie udało się zmienić tytułu", error.code, error.message);
  return !error;
}

/**
 * Usuwa rozmowę razem z wiadomościami. Najpierw wiadomości, potem rozmowę –
 * działa także wtedy, gdy relacja w bazie nie ma kasowania kaskadowego.
 */
export async function deleteConversation(id: number) {
  const db = getSupabase();
  if (!db) return false;
  const msgs = await db.from("messages").delete().eq("conversation_id", id);
  if (msgs.error) {
    console.error("[baza] nie udało się usunąć wiadomości rozmowy", msgs.error.code, msgs.error.message);
    return false;
  }
  const { error, count } = await db.from("conversations").delete({ count: "exact" }).eq("id", id);
  if (error) {
    console.error("[baza] nie udało się usunąć rozmowy", error.code, error.message);
    return false;
  }
  return (count ?? 0) > 0;
}
