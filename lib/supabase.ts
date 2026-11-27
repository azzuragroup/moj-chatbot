// Tylko serwer: import tego pliku w komponencie klienckim przerwie build.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klient z kluczem SUPABASE_SECRET_KEY – tylko dla wspólnej bazy wiedzy
 * (documents, chunks, match_chunks). Ten klucz omija RLS, dlatego zostaje wyłącznie
 * na serwerze (bez przedrostka NEXT_PUBLIC_, bez importów w komponentach klienckich).
 *
 * Rozmowy, wiadomości i profil NIE idą tędy: czyta je i zapisuje klient zalogowanej
 * osoby (getUserDb w lib/supabase/server.ts – klucz publishable + jej sesja), więc pilnuje ich RLS.
 */
let client: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= createClient(process.env.SUPABASE_URL!.trim(), process.env.SUPABASE_SECRET_KEY!.trim(), {
    // Serwer nie loguje użytkowników przez Supabase – bez sesji i odświeżania tokenów.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
