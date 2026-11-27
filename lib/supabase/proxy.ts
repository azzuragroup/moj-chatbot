import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "@/lib/authRedirect";

/** Strony dostępne bez logowania. */
const PUBLIC_PATHS = ["/login", "/auth"];

const isPublic = (pathname: string) => PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Odświeża sesję Supabase przy każdym żądaniu i przekierowuje niezalogowanych na /login.
 * Wzorzec z dokumentacji Supabase „Server-Side Auth for Next.js” (lib/supabase/proxy.ts).
 *
 * Endpointy /api nie są przekierowywane – każdy sam sprawdza sesję i zwraca 401.
 * Strony też same sprawdzają sesję (proxy to dodatkowa warstwa, nie jedyna).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return supabaseResponse; // strony same pokażą brak dostępu

  // Nowy klient na każde żądanie (nie trzymamy go w zmiennej globalnej).
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => supabaseResponse.headers.set(k, v));
      },
    },
  });

  // Nic pomiędzy createServerClient a getClaims() – inaczej sesje potrafią losowo wygasać.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname, search } = request.nextUrl;
  if (!user && !isPublic(pathname) && !pathname.startsWith("/api/")) {
    // Zapamiętujemy, dokąd ktoś chciał wejść (?next=…) – po zalogowaniu tam wróci.
    const loginUrl = new URL(loginPath(pathname + search), request.url);
    // Przenosimy ciasteczka i nagłówki cache, jak zaleca dokumentacja.
    const redirect = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = supabaseResponse.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  // Zwracamy dokładnie ten obiekt, który zbudował setAll (z odświeżonymi ciasteczkami).
  return supabaseResponse;
}
