/**
 * Strażnik narzędzi agenta: limity na jedno zadanie i czytelne błędy.
 * Bez importów lokalnych – testowany bezpośrednio w Node.
 */

/** Najwyżej tyle wywołań narzędzi na jedno zadanie (osobno od kroków modelu). */
export const MAX_TOOL_CALLS = 16;
/** Pojedyncze narzędzie czeka na źródło danych najwyżej tyle. */
export const TOOL_TIMEOUT_MS = 10_000;
/** Twardy limit czasu na całe zadanie. */
export const TASK_TIMEOUT_MS = 60_000;
/** Po tym czasie agent nie zaczyna nowych narzędzi, tylko podsumowuje (zapas na odpowiedź). */
export const SUMMARY_AFTER_MS = 45_000;

/**
 * Generowanie obrazu to wywołanie modelu obrazów, a nie odczyt danych z API –
 * trwa zwykle kilkanaście sekund, więc ma własny, dłuższy limit.
 */
export const SLOW_TOOLS: Record<string, number> = {
  generujObraz: 40_000,
  postInstagram: 40_000,
};

export type StopReason = "kroki" | "narzedzia" | "czas";

const TIMED_OUT = Symbol("timeout");

type GuardOptions = {
  maxCalls?: number;
  toolTimeoutMs?: number;
  summaryAfterMs?: number;
  now?: () => number;
};

function isErrorResult(value: unknown) {
  return typeof value === "object" && value !== null && "blad" in value;
}

export function createToolGuard({
  maxCalls = MAX_TOOL_CALLS,
  toolTimeoutMs = TOOL_TIMEOUT_MS,
  summaryAfterMs = SUMMARY_AFTER_MS,
  now = Date.now,
}: GuardOptions = {}) {
  const start = now();
  let calls = 0;
  const failed = new Set<string>();
  const stamp = () => new Date(now()).toISOString();

  return {
    get calls() {
      return calls;
    },
    elapsedMs: () => now() - start,
    /** Czy agent powinien już kończyć (i z jakiego powodu). */
    stopReason(): StopReason | null {
      if (calls >= maxCalls) return "narzedzia";
      if (now() - start >= summaryAfterMs) return "czas";
      return null;
    },
    /** Uruchamia narzędzie z limitami. Nigdy nie rzuca błędu. */
    async run(name: string, input: unknown, exec: () => unknown, timeoutMs = toolTimeoutMs): Promise<unknown> {
      const key = `${name}:${JSON.stringify(input)}`;
      if (failed.has(key)) {
        return {
          blad: `To samo wywołanie narzędzia ${name} już się nie udało. Nie powtarzaj go – napisz, czego nie udało się sprawdzić.`,
          pobrano: stamp(),
        };
      }
      if (calls >= maxCalls) {
        return {
          blad: `Wyczerpano limit ${maxCalls} wywołań narzędzi na jedno zadanie. Zakończ odpowiedzią z tym, co już wiesz.`,
          pobrano: stamp(),
        };
      }
      if (now() - start >= summaryAfterMs) {
        return {
          blad: "Kończy się czas na to zadanie. Nie sprawdzaj już nic więcej – podsumuj, co wiesz.",
          pobrano: stamp(),
        };
      }
      calls += 1;

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
      });
      try {
        const result = await Promise.race([Promise.resolve().then(exec), timeout]);
        if (result === TIMED_OUT) {
          failed.add(key);
          return {
            blad: `Źródło nie odpowiada (narzędzie ${name}, limit ${Math.round(timeoutMs / 1000)} s). Nie udało się tego sprawdzić.`,
            pobrano: stamp(),
          };
        }
        if (isErrorResult(result)) failed.add(key);
        return result;
      } catch {
        failed.add(key);
        return { blad: `Narzędzie ${name} zgłosiło błąd. Nie udało się tego sprawdzić.`, pobrano: stamp() };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export type ToolGuard = ReturnType<typeof createToolGuard>;

type AnyTool = { execute?: (input: never, options: never) => unknown; type?: string };

/**
 * Owija `execute` każdego lokalnego narzędzia strażnikiem.
 * Narzędzia wykonywane przez dostawcę (np. wyszukiwanie OpenRouter) zostają bez zmian.
 */
export function guardTools<T extends Record<string, AnyTool>>(tools: T, guard: ToolGuard): T {
  const wrapped: Record<string, AnyTool> = {};
  for (const [name, t] of Object.entries(tools)) {
    const execute = t.execute as ((input: unknown, options: unknown) => unknown) | undefined;
    if (!execute || t.type === "provider") {
      wrapped[name] = t;
      continue;
    }
    wrapped[name] = {
      ...t,
      execute: ((input: unknown, options: unknown) =>
        guard.run(name, input, () => execute(input, options), SLOW_TOOLS[name])) as AnyTool["execute"],
    };
  }
  return wrapped as T;
}

/** Dopisek do instrukcji, gdy agent musi kończyć z powodu limitu narzędzi lub czasu. */
export function summaryInstruction(reason: StopReason, maxSteps: number) {
  const why =
    reason === "kroki"
      ? `to ostatni, ${maxSteps}. krok`
      : reason === "narzedzia"
        ? `wykorzystano limit ${MAX_TOOL_CALLS} wywołań narzędzi`
        : `zadanie trwa już blisko ${TASK_TIMEOUT_MS / 1000} sekund`;
  return `Limit: ${why}. Nie używaj już narzędzi.
Napisz krótko po polsku:
- co udało się ustalić na podstawie dotychczasowych wyników narzędzi,
- czego nie udało się sprawdzić (i dlaczego, jeśli narzędzie zwróciło błąd),
- co użytkownik może zrobić dalej (np. zadać pytanie w częściach).
Nie zgaduj brakujących danych.`;
}
