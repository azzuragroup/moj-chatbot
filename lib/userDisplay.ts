/**
 * Imię i avatar do nagłówka – z danych konta u dostawcy (user_metadata w zweryfikowanym tokenie sesji).
 * Czysta funkcja bez importów (testowana bezpośrednio w Node).
 *
 * Pola sprawdzone w prawdziwych danych konta Google w Supabase (auth.users.raw_user_meta_data):
 * full_name i name (imię i nazwisko), avatar_url i picture (ten sam adres, lh3.googleusercontent.com).
 * Konto e-mailowe tych pól nie ma – wtedy nagłówek pokazuje sam e-mail.
 */

const MAX_DISPLAY_NAME = 60;
const MAX_URL = 2048;

const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Avatar tylko z adresu https:// (bez javascript:, data:, http: itp.). */
function safeAvatarUrl(v: unknown): string | null {
  const raw = text(v);
  if (!raw || raw.length > MAX_URL) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
}

export type UserDisplay = { name: string | null; avatarUrl: string | null };

export function displayFromMetadata(metadata: unknown): UserDisplay {
  const m = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
  const name = text(m.full_name) || text(m.name);
  return {
    name: name ? name.slice(0, MAX_DISPLAY_NAME) : null,
    avatarUrl: safeAvatarUrl(m.avatar_url) ?? safeAvatarUrl(m.picture),
  };
}

/** Pierwsza litera imienia (albo e-maila) do kółka zamiast zdjęcia, np. „Łukasz” → „Ł”. */
export function avatarInitial(name: string | null | undefined, email: string | null | undefined): string {
  const source = text(name) || text(email);
  const first = Array.from(source).find((ch) => /[\p{L}\p{N}]/u.test(ch));
  return first ? first.toLocaleUpperCase("pl-PL") : "?";
}
