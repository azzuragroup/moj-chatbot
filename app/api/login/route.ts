import { cookies } from "next/headers";
import {
  LOCK_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieOptions,
  createSessionToken,
  getAuthConfig,
  passwordMatches,
  readToken,
  signToken,
} from "@/lib/auth";

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;
const FAIL_DELAY_MS = 1000;

// Dodatkowy hamulec per instancja serwera. Na hostingu bez stałego procesu
// (np. serverless) NIE jest to globalna ochrona.
const ipAttempts = new Map<string, { n: number; resetAt: number }>();

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

function text(message: string, status: number, headers?: HeadersInit) {
  return new Response(message, { status, headers });
}

export async function POST(req: Request) {
  const config = getAuthConfig();
  if (!config) {
    return text(
      "Brak konfiguracji serwera: ustaw CHAT_PASSWORD i SESSION_SECRET (min. 32 znaki) w .env.local i zrestartuj serwer.",
      503,
    );
  }

  const jar = await cookies();
  const now = Date.now();

  // Blokada w podpisanym cookie (per przeglądarka).
  const lock = readToken<{ exp: number; n: number }>(
    jar.get(LOCK_COOKIE)?.value,
    config.secret,
  );
  // Blokada w pamięci (per instancja).
  const ip = clientIp(req);
  const mem = ipAttempts.get(ip);
  if (mem && mem.resetAt < now) ipAttempts.delete(ip);
  const memLocked = (ipAttempts.get(ip)?.n ?? 0) >= MAX_ATTEMPTS;

  if ((lock && lock.n >= MAX_ATTEMPTS) || memLocked) {
    return text("Za dużo prób. Spróbuj ponownie za kilka minut.", 429);
  }

  let password = "";
  try {
    const body = await req.json();
    if (typeof body?.password === "string") password = body.password;
  } catch {}

  if (!password || !passwordMatches(password, config.password)) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    const entry = ipAttempts.get(ip) ?? { n: 0, resetAt: now + LOCK_SECONDS * 1000 };
    entry.n += 1;
    ipAttempts.set(ip, entry);
    const n = (lock?.n ?? 0) + 1;
    jar.set(
      LOCK_COOKIE,
      signToken({ exp: now + LOCK_SECONDS * 1000, n }, config.secret),
      cookieOptions(LOCK_SECONDS),
    );
    return text("Nieprawidłowe hasło.", 401);
  }

  ipAttempts.delete(ip);
  jar.delete(LOCK_COOKIE);
  jar.set(
    SESSION_COOKIE,
    createSessionToken(config.secret),
    cookieOptions(SESSION_TTL_SECONDS),
  );
  return new Response(null, { status: 204 });
}
