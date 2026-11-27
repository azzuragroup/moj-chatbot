/**
 * Powrót po zalogowaniu na stronę, na którą ktoś chciał wejść (?next=…).
 * Czysta logika bez importów (testowana bezpośrednio w Node).
 *
 * Przepuszczamy wyłącznie adresy wewnątrz aplikacji: ścieżka zaczynająca się od jednego „/”.
 * Odrzucamy m.in. „//zly.pl”, „https://zly.pl”, „/\zly.pl”, znaki sterujące (przeglądarka je usuwa,
 * więc „/\t/zly.pl” zamieniłoby się w „//zly.pl”) oraz strony logowania i API (bez pętli).
 */

const BASE = "http://aplikacja.invalid";
const MAX_LENGTH = 512;

export function safeNextPath(value: unknown, fallback = "/"): string {
  const cleaned = safeNextPathRaw(value, fallback);
  // Parametry błędu logowania nie są celem – nie wracamy na adres z ?error=… po zalogowaniu.
  const [path, query = ""] = cleaned.split("?");
  const hash = query.includes("#") ? query.slice(query.indexOf("#")) : "";
  return withoutOAuthError(path, hash ? query.slice(0, query.indexOf("#")) : query) + hash;
}

function safeNextPathRaw(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.length > MAX_LENGTH) return fallback;
  if (v.includes("\\") || /[\u0000-\u001f\u007f]/.test(v)) return fallback;

  let url: URL;
  try {
    url = new URL(v, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;

  const { pathname } = url;
  const blocked = ["/login", "/auth", "/api"];
  if (blocked.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return fallback;

  const result = pathname + url.search + url.hash;
  // Po normalizacji (np. „/.//zly.pl”) adres nie może zaczynać się od „//”.
  return result.startsWith("//") ? fallback : result;
}

/** Adres strony logowania z zapamiętanym celem (bez ?next dla strony głównej). */
export function loginPath(next: unknown): string {
  const target = safeNextPath(next);
  return target === "/" ? "/login" : `/login?next=${encodeURIComponent(target)}`;
}

/** Powody powrotu na /login z błędem (?blad=…). */
export type LoginErrorReason = "link" | "google" | "google-anulowane" | "google-wygaslo";

/** Parametry, którymi Supabase/Google zgłaszają błąd logowania u dostawcy. */
const OAUTH_ERROR_PARAMS = ["error", "error_code", "error_description"] as const;

type Params = { get(name: string): string | null; has(name: string): boolean };

/**
 * Błąd logowania u dostawcy w adresie (?error=…&error_code=…|error_description=…) → powód dla /login.
 * Supabase odsyła go do /auth/callback albo – gdy nie ufa już adresowi powrotu (np. przeterminowany
 * stan logowania) – na adres strony (Site URL). Sam ?error= bez kodu/opisu nie jest błędem logowania.
 */
export function oauthErrorReason(params: Params): LoginErrorReason | null {
  const error = params.get("error");
  if (!error || !(params.has("error_code") || params.has("error_description"))) return null;
  const code = params.get("error_code") ?? "";
  if (error === "access_denied" || code === "access_denied") return "google-anulowane";
  if (code === "bad_oauth_state" || code === "flow_state_expired" || code === "flow_state_not_found") return "google-wygaslo";
  return "google";
}

/** Adres bez parametrów błędu logowania (np. po udanym ponownym logowaniu). */
export function withoutOAuthError(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  for (const p of OAUTH_ERROR_PARAMS) params.delete(p);
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}

/** Adres strony logowania z błędem i zachowanym celem, np. /login?next=%2Fupload&blad=google. */
export function loginErrorPath(next: unknown, reason: LoginErrorReason): string {
  const base = loginPath(next);
  return `${base}${base.includes("?") ? "&" : "?"}blad=${reason}`;
}

const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::\d{1,5})?$/i;

/**
 * Adres, pod którym aplikacja właśnie działa – do adresu powrotu z logowania u dostawcy (Google).
 * Jak w dokumentacji Supabase: za serwerem pośredniczącym (np. Vercel) prawdziwy adres jest
 * w X-Forwarded-Host / X-Forwarded-Proto, lokalnie w nagłówku Host.
 * Przyjmujemy tylko poprawną nazwę hosta (bez ścieżek i znaków specjalnych) oraz http/https;
 * inaczej – adres zapasowy. Supabase i tak przekieruje tylko na adresy z listy Redirect URLs.
 */
export function requestOrigin(header: (name: string) => string | null | undefined, fallback: string): string {
  const first = (v: string | null | undefined) => v?.split(",")[0]?.trim() || "";
  const host = first(header("x-forwarded-host")) || first(header("host"));
  const proto = (first(header("x-forwarded-proto")) || fallback.split(":")[0]).toLowerCase();
  if (!host || !HOST_RE.test(host) || (proto !== "http" && proto !== "https")) return fallback;
  return `${proto}://${host.toLowerCase()}`;
}
