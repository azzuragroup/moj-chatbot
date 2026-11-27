import { tool } from "ai";
import { z } from "zod";

/** Zmienne, których aplikacja potrzebuje do działania. */
export const REQUIRED_ENV = [
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

/**
 * Sprawdza tylko, czy zmienna ma niepustą wartość. Zwraca „tak”/„nie”,
 * nigdy samej wartości.
 */
export function envStatus(env: Record<string, string | undefined> = process.env) {
  return Object.fromEntries(
    REQUIRED_ENV.map((name) => [name, env[name] && env[name]!.trim() ? "tak" : "nie"]),
  ) as Record<(typeof REQUIRED_ENV)[number], "tak" | "nie">;
}

type DiagnosticsConfig = { modelId: string; toolNames: string[]; maxSteps: number };

export function diagnosticsReport(
  { modelId, toolNames, maxSteps }: DiagnosticsConfig,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
) {
  return {
    model: modelId,
    narzedzia: toolNames,
    limitKrokow: maxSteps,
    zmienneUstawione: envStatus(env),
    pobrano: now.toISOString(),
  };
}

/** Narzędzie diagnostyka. Nazwy narzędzi przekazuje agent, żeby lista była zawsze aktualna. */
export function createDiagnosticsTool(config: DiagnosticsConfig) {
  return tool({
    description:
      "Pokazuje stan asystenta: nazwę używanego modelu, listę dostępnych narzędzi, limit kroków " +
      "oraz informację tak/nie, czy wymagane zmienne środowiskowe są ustawione. Użyj, gdy " +
      "użytkownik pyta o diagnostykę, konfigurację, model, dostępne narzędzia lub limit kroków. " +
      "Nigdy nie podawaj wartości zmiennych środowiskowych – narzędzie ich nie zwraca.",
    inputSchema: z.object({}),
    execute: async () => diagnosticsReport(config),
  });
}
