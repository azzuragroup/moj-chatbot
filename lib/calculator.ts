import { tool } from "ai";
import { z } from "zod";

export const OPERATIONS = [
  "dodaj",
  "odejmij",
  "pomnoz",
  "podziel",
  "potega",
  "pierwiastek",
  "procent",
  "srednia",
] as const;
export type Operation = (typeof OPERATIONS)[number];

export type CalculatorResult =
  | { dzialanie: Operation; liczby: number[]; wynik: number; zapis: string; pobrano: string }
  | { blad: string; pobrano: string };

// Ile liczb potrzebuje działanie: [minimum, maksimum].
const ARITY: Record<Operation, [number, number]> = {
  dodaj: [2, 50],
  odejmij: [2, 50],
  pomnoz: [2, 50],
  podziel: [2, 2],
  potega: [2, 2],
  pierwiastek: [1, 1],
  procent: [2, 2],
  srednia: [1, 50],
};

/** Usuwa błędy zaokrągleń typu 0.1 + 0.2 = 0.30000000000000004. */
const tidy = (n: number) => Number.parseFloat(n.toPrecision(12));
const fmt = (n: number) => String(n).replace(".", ",");

/**
 * Liczy działanie na liczbach podanych jako osobne argumenty.
 * Nie wykonuje żadnego wpisanego tekstu ani kodu. Nigdy nie rzuca błędu.
 */
export function calculate(op: Operation, numbers: number[], now: Date = new Date()): CalculatorResult {
  const pobrano = now.toISOString();
  const [min, max] = ARITY[op];
  if (numbers.length < min || numbers.length > max) {
    const need = min === max ? `${min}` : `od ${min} do ${max}`;
    return { blad: `Działanie „${op}” potrzebuje ${need} liczb, a podano ${numbers.length}.`, pobrano };
  }
  if (!numbers.every(Number.isFinite)) {
    return { blad: "Wszystkie argumenty muszą być skończonymi liczbami.", pobrano };
  }
  const [a, b] = numbers;
  let wynik: number;
  let zapis: string;
  switch (op) {
    case "dodaj":
      wynik = numbers.reduce((s, n) => s + n, 0);
      zapis = numbers.map(fmt).join(" + ");
      break;
    case "odejmij":
      wynik = numbers.slice(1).reduce((s, n) => s - n, a);
      zapis = numbers.map(fmt).join(" − ");
      break;
    case "pomnoz":
      wynik = numbers.reduce((s, n) => s * n, 1);
      zapis = numbers.map(fmt).join(" × ");
      break;
    case "podziel":
      if (b === 0) return { blad: "Nie można dzielić przez zero.", pobrano };
      wynik = a / b;
      zapis = `${fmt(a)} ÷ ${fmt(b)}`;
      break;
    case "potega":
      wynik = a ** b;
      zapis = `${fmt(a)} ^ ${fmt(b)}`;
      break;
    case "pierwiastek":
      if (a < 0) return { blad: "Nie można obliczyć pierwiastka z liczby ujemnej.", pobrano };
      wynik = Math.sqrt(a);
      zapis = `√${fmt(a)}`;
      break;
    case "procent":
      wynik = (a / 100) * b;
      zapis = `${fmt(a)}% z ${fmt(b)}`;
      break;
    case "srednia":
      wynik = numbers.reduce((s, n) => s + n, 0) / numbers.length;
      zapis = `średnia(${numbers.map(fmt).join("; ")})`;
      break;
  }
  if (!Number.isFinite(wynik)) {
    return { blad: "Wynik jest za duży, żeby go podać.", pobrano };
  }
  wynik = tidy(wynik);
  return { dzialanie: op, liczby: numbers, wynik, zapis: `${zapis} = ${fmt(wynik)}`, pobrano };
}

export const kalkulator = tool({
  description:
    "Dokładnie liczy działania na liczbach: dodawanie, odejmowanie, mnożenie, dzielenie, potęgę, " +
    "pierwiastek kwadratowy, procent z liczby i średnią. Użyj zawsze, gdy odpowiedź wymaga obliczeń " +
    "(np. powierzchnia, liczba arkuszy, rabat, VAT, suma zamówienia), zamiast liczyć w pamięci. " +
    "Liczby podawaj jako osobne argumenty, nie jako tekst działania. Złożone obliczenia rozbij " +
    "na kolejne wywołania. Jeśli wynik zawiera „blad”, przekaż komunikat.",
  inputSchema: z.object({
    dzialanie: z
      .enum(OPERATIONS)
      .describe(
        "dodaj, odejmij (pierwsza minus kolejne), pomnoz, podziel (pierwsza przez drugą), " +
          "potega (pierwsza do potęgi drugiej), pierwiastek (z jednej liczby), " +
          "procent (pierwsza liczba to ile procent, druga – z czego), srednia.",
      ),
    liczby: z
      .array(z.number().finite())
      .min(1)
      .max(50)
      .describe("Liczby jako osobne elementy listy, np. [12, 180]. Ułamki z kropką: 1.5."),
  }),
  execute: async ({ dzialanie, liczby }) => calculate(dzialanie, liczby),
});
