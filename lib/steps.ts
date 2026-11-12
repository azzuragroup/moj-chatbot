/** Limit kroków agenta (każde wywołanie modelu to jeden krok). */
export const MAX_STEPS = 5;

/**
 * Agent doszedł do limitu, gdy wykonał wszystkie kroki, a ostatni krok
 * zakończył się kolejnym wywołaniem narzędzia zamiast odpowiedzi.
 */
export function hitStepLimit(steps: number, finishReason: string | undefined, max = MAX_STEPS) {
  return steps >= max && finishReason === "tool-calls";
}
