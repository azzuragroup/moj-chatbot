import { tool } from "ai";
import { z } from "zod";

const NBP_URL = "https://api.nbp.pl/api/exchangerates/rates";
const TIMEOUT_MS = 10_000;

// Kształt odpowiedzi NBP (sprawdzony na api.nbp.pl): tabela, nazwa, kod i kurs średni.
const rateSchema = z.object({
  table: z.string(),
  currency: z.string(),
  code: z.string(),
  rates: z
    .array(z.object({ no: z.string(), effectiveDate: z.string(), mid: z.number().positive() }))
    .min(1),
});

export type CurrencyResult =
  | {
      waluta: string;
      kod: string;
      kursSredniPLN: number;
      tabelaNBP: string;
      dataKursu: string;
      przeliczenie?: { kwota: number; z: string; wynik: number; na: string };
      zrodlo: string;
      pobrano: string;
    }
  | { blad: string; pobrano: string };

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

/**
 * Pobiera aktualny kurs średni NBP waluty wobec złotego i (opcjonalnie) przelicza kwotę.
 * Szuka najpierw w tabeli A (główne waluty), potem w tabeli B. Nigdy nie rzuca błędu.
 */
export async function getCurrency(
  code: string,
  amount?: number,
  direction: "na_zlote" | "ze_zlotych" = "na_zlote",
  fetchFn: Fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<CurrencyResult> {
  const pobrano = now().toISOString();
  const kod = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(kod)) {
    return { blad: `„${code}” to nie jest kod waluty. Podaj trzy litery, np. EUR, USD, CZK.`, pobrano };
  }
  if (kod === "PLN") {
    return { blad: "PLN to złoty – kurs złotego wobec złotego wynosi 1. Podaj inną walutę.", pobrano };
  }

  let unavailable = false;
  for (const table of ["a", "b"]) {
    try {
      const res = await fetchFn(`${NBP_URL}/${table}/${kod.toLowerCase()}/?format=json`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 404) continue; // brak waluty w tej tabeli
      if (!res.ok) {
        unavailable = true;
        continue;
      }
      const parsed = rateSchema.safeParse(await res.json());
      if (!parsed.success) {
        unavailable = true;
        continue;
      }
      const { currency, rates } = parsed.data;
      const { no, effectiveDate, mid } = rates[0];
      const result: CurrencyResult = {
        waluta: currency,
        kod,
        kursSredniPLN: mid,
        tabelaNBP: no,
        dataKursu: effectiveDate,
        zrodlo: "Narodowy Bank Polski, kurs średni (api.nbp.pl)",
        pobrano,
      };
      if (amount !== undefined) {
        result.przeliczenie =
          direction === "na_zlote"
            ? { kwota: amount, z: kod, wynik: round(amount * mid, 2), na: "PLN" }
            : { kwota: amount, z: "PLN", wynik: round(amount / mid, 2), na: kod };
      }
      return result;
    } catch {
      unavailable = true;
    }
  }
  if (unavailable) {
    return { blad: "Źródło nie odpowiada (NBP). Nie udało się sprawdzić kursu.", pobrano };
  }
  return { blad: `NBP nie publikuje kursu waluty o kodzie ${kod}. Sprawdź kod waluty.`, pobrano };
}

export const waluty = tool({
  description:
    "Podaje aktualny kurs średni NBP wybranej waluty wobec złotego (PLN) i przelicza kwotę " +
    "z tej waluty na złote albo ze złotych na tę walutę. Użyj, gdy pytanie dotyczy kursu walut, " +
    "ile coś kosztuje w złotych lub w euro, albo przeliczenia kwoty. Kurs średni NBP ma charakter " +
    "informacyjny – banki i kantory stosują inne kursy. Jeśli wynik zawiera „blad”, przekaż komunikat.",
  inputSchema: z.object({
    waluta: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Za-z]{3}$/, "Trzyliterowy kod waluty")
      .describe("Kod waluty ISO 4217, np. EUR, USD, GBP, CHF, CZK, HUF. Nie PLN."),
    kwota: z
      .number()
      .positive()
      .max(1_000_000_000)
      .optional()
      .describe("Kwota do przeliczenia. Pomiń, gdy potrzebny jest tylko kurs."),
    kierunek: z
      .enum(["na_zlote", "ze_zlotych"])
      .optional()
      .describe("na_zlote: kwota w walucie → PLN (domyślnie); ze_zlotych: kwota w PLN → waluta."),
  }),
  execute: async ({ waluta, kwota, kierunek }) => getCurrency(waluta, kwota, kierunek ?? "na_zlote"),
});
