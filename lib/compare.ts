export type CompareTask = {
  id: string;
  question: string;
  expected: number;
  unit: string;
};

export const TASKS: CompareTask[] = [
  {
    id: "podloga",
    question:
      "Podłoga ma 5 m × 4 m. Arkusz sklejki ma 2500 × 1250 mm. Klient chce 10% zapasu na docinki. Ile pełnych arkuszy trzeba zamówić?",
    expected: 8,
    unit: "arkuszy",
  },
  {
    id: "cena",
    question:
      "Klient kupuje 12 arkuszy po 180 zł netto za sztukę. Dostaje 5% rabatu od wartości netto, potem doliczamy 23% VAT. Ile zapłaci brutto w złotych?",
    expected: 2523.96,
    unit: "zł",
  },
  {
    id: "pilka",
    question:
      "Kij i piłka kosztują razem 1,10 zł. Kij kosztuje o 1 zł więcej niż piłka. Ile groszy kosztuje piłka?",
    expected: 5,
    unit: "gr",
  },
];

export const VARIANTS = {
  plain: "Odpowiedz na pytanie.",
  stepByStep:
    "Najpierw rozumuj krok po kroku i zapisz kolejne obliczenia, potem podaj wynik.",
} as const;

export type VariantId = keyof typeof VARIANTS;

export const RESULT_FORMAT =
  "Ostatnia linia odpowiedzi musi mieć postać: Wynik: <sama liczba>";

/** Wyciąga liczbę z ostatniej linii „Wynik: …”. Zwraca null, gdy jej brak. */
export function parseResult(text: string): number | null {
  const matches = [...text.matchAll(/wynik\s*:\s*\**\s*([-\d\s., ]+)/gi)];
  const last = matches.at(-1)?.[1];
  if (!last) return null;
  let s = last.replace(/[\s ]/g, "").replace(/[.,]$/, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "");
  s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Ocena wyłącznie po wyniku. Długość uzasadnienia nie ma znaczenia. */
export function isCorrect(result: number | null, expected: number) {
  return result !== null && Math.abs(result - expected) < 0.01;
}
