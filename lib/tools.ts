import { tool } from "ai";
import { z } from "zod";

export const DEFAULT_TIME_ZONE = "Europe/Warsaw";

/** Czy przeglądarka/Node zna taką strefę czasową (np. „Europe/Warsaw”). */
export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Data, dzień tygodnia, godzina i przesunięcie względem UTC w podanej strefie. */
export function currentTime(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pl-PL", { timeZone, ...options }).format(now);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  return {
    data: date,
    dzienTygodnia: part({ weekday: "long" }),
    godzina: part({ hour: "2-digit", minute: "2-digit", hour12: false }),
    strefaCzasowa: timeZone,
    przesuniecieUTC: offset === "GMT" ? "UTC+00:00" : offset.replace("GMT", "UTC"),
  };
}

/** Wersja dla Polski (zostawiona dla zgodności). */
export function currentWarsawTime(now: Date = new Date()) {
  const { data, dzienTygodnia, godzina, strefaCzasowa } = currentTime(DEFAULT_TIME_ZONE, now);
  return { data, dzienTygodnia, godzina, strefaCzasowa };
}

export type TimeResult =
  | (ReturnType<typeof currentTime> & { pobrano: string })
  | { blad: string; pobrano: string };

/** Wynik narzędzia czas. Nigdy nie rzuca błędu. */
export function timeIn(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): TimeResult {
  const pobrano = now.toISOString();
  if (!isValidTimeZone(timeZone)) {
    return {
      blad: `Nie znam strefy czasowej „${timeZone}”. Podaj ją w formacie Kontynent/Miasto, np. Europe/Berlin.`,
      pobrano,
    };
  }
  return { ...currentTime(timeZone, now), pobrano };
}

export const czas = tool({
  description:
    "Zwraca aktualną datę (RRRR-MM-DD), dzień tygodnia, godzinę i przesunięcie względem UTC " +
    "w podanej strefie czasowej (domyślnie Polska, Europe/Warsaw). Użyj zawsze, gdy odpowiedź " +
    "zależy od bieżącej daty lub godziny: pytania o „dziś”, „jutro”, „wczoraj”, „teraz”, " +
    "„za ile dni”, „ile zostało do”, dzień tygodnia, termin liczony od dzisiaj albo godzinę " +
    "w innym kraju lub mieście. Nie zgaduj daty z pamięci.",
  inputSchema: z.object({
    strefa: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$|^UTC$/, "Strefa w formacie IANA, np. Europe/Berlin")
      .optional()
      .describe(
        "Strefa czasowa IANA, np. „Europe/Warsaw”, „Europe/Berlin”, „America/New_York”, „Asia/Tokyo”. " +
          "Dla miasta wybierz jego strefę. Pomiń dla Polski.",
      ),
  }),
  execute: async ({ strefa }) => timeIn(strefa ?? DEFAULT_TIME_ZONE),
});
