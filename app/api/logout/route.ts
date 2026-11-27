import { createClient, getCurrentUser } from "@/lib/supabase/server";

/** Wylogowanie z Supabase Auth: kończy tę sesję i usuwa jej ciasteczka. */
export async function POST() {
  // Zweryfikowana sesja Supabase (getClaims) – bez niej 401.
  if (!(await getCurrentUser())) {
    return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  }
  const supabase = await createClient();
  // scope "local": wylogowuje tylko to urządzenie, nie wszystkie sesje tej osoby.
  const { error } = (await supabase?.auth.signOut({ scope: "local" })) ?? { error: null };
  if (error) return new Response("Nie udało się wylogować. Spróbuj ponownie.", { status: 500 });
  return new Response(null, { status: 204 });
}
