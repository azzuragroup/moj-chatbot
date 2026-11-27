// Tylko serwer: import tego pliku w komponencie klienckim przerwie build.
import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { displayFromMetadata } from "@/lib/userDisplay";

/**
 * Supabase Auth po stronie serwera (Server Components, Route Handlers).
 * Wzorzec z dokumentacji Supabase „Server-Side Auth for Next.js” (@supabase/ssr).
 * Sesja zalogowanej osoby i klient do jej danych (getUserDb) – bazy pilnuje RLS.
 */

export function authEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

/** Nowy klient na każde żądanie (czyta ciasteczka tego żądania). Bez konfiguracji: null. */
export async function createClient() {
  const env = authEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Wywołane z Server Component – tam nie da się zapisać ciasteczek.
          // Sesję odświeża proxy.ts, więc można to pominąć.
        }
      },
    },
  });
}

/**
 * Klient do danych zalogowanej osoby (rozmowy, wiadomości, profil):
 * klucz publishable + jej sesja z ciasteczek. Bazy pilnuje RLS – zapytania widzą
 * i zmieniają tylko wiersze z user_id = auth.uid(). Kolumnę user_id wypełnia baza
 * (domyślnie auth.uid()); nigdy nie przyjmujemy jej z przeglądarki ani od modelu.
 * Tworzymy go raz na zapytanie, po sprawdzeniu sesji (getCurrentUser).
 */
export const getUserDb = createClient;
export type UserDb = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/**
 * name i avatarUrl: z danych konta u dostawcy (np. Google) zapisanych w zweryfikowanym tokenie
 * (claims.user_metadata) – tylko do wyświetlenia w nagłówku, nigdy do decyzji o dostępie.
 */
export type CurrentUser = { id: string; email: string | null; name: string | null; avatarUrl: string | null };

/**
 * Zalogowana osoba albo null. Tożsamość ustala wyłącznie serwer:
 * getClaims() weryfikuje podpis tokenu sesji (samo odczytanie ciasteczka nie wystarcza,
 * bo ciasteczko można podrobić). Nigdy nie bierzemy identyfikatora z formularza, adresu ani modelu.
 * cache() – w jednym renderze strony (layout + strona) sprawdzamy sesję tylko raz.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || claims.is_anonymous) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    ...displayFromMetadata(claims.user_metadata),
  };
});
