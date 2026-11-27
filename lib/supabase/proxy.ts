import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginErrorPath, loginPath, oauthErrorReason, withoutOAuthError } from "@/lib/authRedirect";

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
  // Przenosimy ciasteczka i nagłówki cache na przekierowanie, jak zaleca dokumentacja.
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = supabaseResponse.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  };

  // Błąd logowania u Google, który Supabase odesłał na zwykłą stronę (np. przeterminowany stan
  // logowania – „bad_oauth_state”): bez sesji → /login z komunikatem po polsku; z sesją → ta sama
  // strona bez parametrów błędu. Trasy /auth/* obsługują błędy same.
  const oauthReason = pathname.startsWith("/api/") || pathname.startsWith("/auth/") ? null : oauthErrorReason(request.nextUrl.searchParams);
  if (oauthReason) {
    return redirectTo(user ? withoutOAuthError(pathname, search) : loginErrorPath("/", oauthReason));
  }

  if (!user && !isPublic(pathname) && !pathname.startsWith("/api/")) {
    // Zapamiętujemy, dokąd ktoś chciał wejść (?next=…) – po zalogowaniu tam wróci.
    return redirectTo(loginPath(pathname + search));
  }

  // Zwracamy dokładnie ten obiekt, który zbudował setAll (z odświeżonymi ciasteczkami).
  return supabaseResponse;
}
