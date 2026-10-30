import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "chat_session";
export const LOCK_COOKIE = "chat_attempts";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

const MIN_SECRET_LENGTH = 32;

/** Zwraca konfigurację albo null. Brak konfiguracji = brak dostępu. */
export function getAuthConfig() {
  const password = process.env.CHAT_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret || secret.length < MIN_SECRET_LENGTH) return null;
  return { password, secret };
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Podpisany token "dane.podpis". W danych nie ma hasła, tylko czas wygaśnięcia. */
export function signToken(data: object, secret: string) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function readToken<T extends { exp: number }>(
  token: string | undefined,
  secret: string,
): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return typeof data.exp === "number" && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export function createSessionToken(secret: string) {
  return signToken(
    { exp: Date.now() + SESSION_TTL_SECONDS * 1000 },
    secret,
  );
}

export function hasValidSession(cookieValue: string | undefined) {
  const config = getAuthConfig();
  if (!config) return false;
  return readToken(cookieValue, config.secret) !== null;
}

export function passwordMatches(given: string, expected: string) {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
