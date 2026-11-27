import { createBrowserClient } from "@supabase/ssr";

/**
 * Klient Supabase w przeglądarce – tylko do logowania, rejestracji i sesji (Supabase Auth).
 * Używa klucza publicznego (publishable), który z założenia może być widoczny w przeglądarce.
 * Dane z tabel czyta wyłącznie serwer (lib/supabase.ts); w bazie działa RLS bez polityk,
 * więc tym kluczem nie da się odczytać ani zmienić żadnych danych.
 *
 * Wzorzec z dokumentacji Supabase „Server-Side Auth for Next.js” (@supabase/ssr).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
