// Tylko serwer: import tego pliku w komponencie klienckim przerwie build.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Jedyne miejsce, w którym aplikacja łączy się z Supabase.
 * Klucz SUPABASE_SECRET_KEY omija RLS, dlatego zostaje wyłącznie na serwerze
 * (bez przedrostka NEXT_PUBLIC_, bez importów w komponentach klienckich).
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
