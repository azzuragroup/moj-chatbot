/** Limit kroków agenta (każde wywołanie modelu to jeden krok). */
export const MAX_STEPS = 6;

/**
 * Czy krok o numerze `stepNumber` (liczonym od 0) jest ostatnim dozwolonym.
 * Dochodzimy do niego tylko wtedy, gdy wszystkie wcześniejsze kroki
 * kończyły się wywołaniem narzędzia – czyli agent wyczerpał limit.
 */
export function isLastStep(stepNumber: number, max = MAX_STEPS) {
  return stepNumber >= max - 1;
}

/** Dopisek do instrukcji w ostatnim kroku: bez narzędzi, tylko podsumowanie. */
export const LIMIT_INSTRUCTION = `Limit kroków: to ostatni, ${MAX_STEPS}. krok. Nie używaj już narzędzi.
Napisz krótko po polsku:
- co udało się ustalić na podstawie dotychczasowych wyników narzędzi,
- czego nie zdążyłeś sprawdzić,
- co użytkownik może zrobić dalej (np. zadać pytanie w częściach).
Nie zgaduj brakujących danych.`;

/**
 * Zapasowe sprawdzenie: agent doszedł do limitu, gdy wykonał wszystkie kroki,
 * a ostatni krok zakończył się kolejnym wywołaniem narzędzia zamiast odpowiedzi.
 */
export function hitStepLimit(steps: number, finishReason: string | undefined, max = MAX_STEPS) {
  return steps >= max && finishReason === "tool-calls";
}
