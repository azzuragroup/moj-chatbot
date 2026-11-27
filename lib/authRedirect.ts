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
