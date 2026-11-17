import { tool } from "ai";
import { z } from "zod";

const NAGER_URL = "https://date.nager.at/api/v3/PublicHolidays";
const TIMEOUT_MS = 10_000;

// Kształt odpowiedzi Nager.Date (sprawdzony na date.nager.at): bierzemy tylko potrzebne pola.
const holidaysSchema = z.array(
  z.object({
    date: z.string(),
    localName: z.string(),
    name: z.string(),
    global: z.boolean(),
    counties: z.array(z.string()).nullable(),
    types: z.array(z.string()),
  }),
);

export type HolidaysResult =
  | {
      kraj: string;
      rok: number;
      liczba: number;
      swieta: {
        data: string;
        nazwa: string;
        nazwaAngielska: string;
        wCalymKraju: boolean;
        regiony?: string[];
        rodzaj: string[];
      }[];
      zrodlo: string;
      pobrano: string;
    }
  | { blad: string; pobrano: string };

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Pobiera dni wolne (święta państwowe) w kraju i roku. Nigdy nie rzuca błędu. */
export async function getHolidays(
  country: string,
  year: number,
  fetchFn: Fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<HolidaysResult> {
  const pobrano = now().toISOString();
  const kraj = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(kraj)) {
    return { blad: `„${country}” to nie jest kod kraju. Podaj dwie litery, np. PL, DE, CZ.`, pobrano };
  }
  try {
    const res = await fetchFn(`${NAGER_URL}/${year}/${kraj}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) {
      return { blad: `Brak danych o świętach dla kraju o kodzie ${kraj}. Sprawdź kod kraju.`, pobrano };
    }
    if (res.status === 204) {
      return { blad: `Brak danych o świętach w kraju ${kraj} w roku ${year}.`, pobrano };
    }
    if (!res.ok) {
      return { blad: "Źródło nie odpowiada (Nager.Date). Nie udało się sprawdzić świąt.", pobrano };
    }
    const parsed = holidaysSchema.safeParse(await res.json());
    if (!parsed.success) {
      return { blad: "Serwis świąt zwrócił nieoczekiwane dane. Spróbuj później.", pobrano };
    }
    const swieta = parsed.data.map((h) => ({
      data: h.date,
      nazwa: h.localName,
      nazwaAngielska: h.name,
      wCalymKraju: h.global,
      ...(h.counties ? { regiony: h.counties } : {}),
      rodzaj: h.types,
    }));
    return {
      kraj,
      rok: year,
      liczba: swieta.length,
      swieta,
      zrodlo: "Nager.Date (date.nager.at)",
      pobrano,
    };
  } catch {
    return { blad: "Źródło nie odpowiada (Nager.Date). Nie udało się sprawdzić świąt.", pobrano };
  }
}

export const swieta = tool({
  description:
    "Zwraca listę dni wolnych od pracy (świąt państwowych) w podanym kraju i roku: datę, nazwę " +
    "lokalną i angielską oraz to, czy święto obowiązuje w całym kraju, czy w regionach. Użyj przy " +
    "pytaniach o święta, dni wolne, długie weekendy, planowanie dostaw, terminów lub kampanii " +
    "w Polsce i za granicą (np. CZ, SK, DE, HU). Jeśli wynik zawiera „blad”, przekaż komunikat.",
  inputSchema: z.object({
    kraj: z
      .string()
      .trim()
      .length(2)
      .regex(/^[A-Za-z]{2}$/, "Dwuliterowy kod kraju")
      .describe("Kod kraju ISO 3166-1 alfa-2, np. PL, DE, CZ, SK, HU."),
    rok: z.number().int().min(1975).max(2075).describe("Rok, np. 2026."),
  }),
  execute: async ({ kraj, rok }) => getHolidays(kraj, rok),
});
