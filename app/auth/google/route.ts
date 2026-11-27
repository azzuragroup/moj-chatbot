import { NextResponse, type NextRequest } from "next/server";
import { loginErrorPath, requestOrigin, safeNextPath } from "@/lib/authRedirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Start logowania przez Google (Supabase Auth, przepływ PKCE po stronie serwera).
 * Wzorzec z dokumentacji Supabase „Sign in with Google” (Next.js, server):
 * signInWithOAuth zapisuje w ciasteczku kod weryfikujący PKCE i zwraca adres Google,
 * na który przekierowujemy kodem 303 (formularz wysyła POST).
 *
 * Adres powrotu budujemy z adresu, pod którym aplikacja właśnie działa (bez localhost na sztywno),
 * a cel po zalogowaniu (?next=) przepuszczamy tylko jako ścieżkę wewnątrz aplikacji.
 * Supabase i tak przyjmie tylko adresy z listy Redirect URLs w panelu.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const next = safeNextPath(form?.get("next"));
  const failed = () => NextResponse.redirect(new URL(loginErrorPath(next, "google"), request.url), 303);

  const supabase = await createClient();
  if (!supabase) return failed();

  // Adres, pod którym aplikacja właśnie działa (lokalnie albo na Vercelu) – tam wracamy z Google,
  // bo tam jest zapisane ciasteczko z kodem PKCE.
  const origin = requestOrigin((name) => request.headers.get(name), request.nextUrl.origin);
  const callback = new URL("/auth/callback", origin);
  if (next !== "/") callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // select_account: po wylogowaniu Google pokazuje wybór konta zamiast logować po cichu to samo.
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data?.url) {
    console.error("[logowanie Google] nie udało się rozpocząć", error?.code ?? "", error?.status ?? "");
    return failed();
  }
  // Ciasteczko z kodem PKCE (zapisane przez cookies() w setAll) jedzie razem z tym przekierowaniem.
  return NextResponse.redirect(data.url, 303);
}
