import { z } from "zod";

export const CATEGORIES = ["sales", "support", "billing", "unknown"] as const;
export const PRIORITIES = ["normal", "high"] as const;

/** Schemat wyniku analizy. Ten sam obiekt idzie do modelu i do walidacji. */
export const analysisSchema = z.strictObject({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  draft: z.string(),
  needs_review: z.boolean(),
});

export type Analysis = z.infer<typeof analysisSchema>;

export type FailureKind =
  | "validation"
  | "refusal"
  | "interrupted"
  | "provider"
  | "config";

export type ValidationResult =
  | { ok: true; analysis: Analysis }
  | { ok: false; kind: FailureKind; message: string; issues: string[] };

function describeIssue(issue: z.core.$ZodIssue, raw: unknown): string[] {
  const field = String(issue.path[0] ?? "");
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((k) => `niedozwolone dodatkowe pole: ${k}`);
  }
  if (
    issue.code === "invalid_type" &&
    raw &&
    typeof raw === "object" &&
    !(field in raw)
  ) {
    return [`brak pola: ${field}`];
  }
  if (issue.code === "invalid_type") {
    return [
      field
        ? `zły typ pola ${field}: oczekiwano ${issue.expected}`
        : `wynik nie jest obiektem JSON`,
    ];
  }
  if (issue.code === "invalid_value") {
    return [`niedozwolona wartość pola ${field}`];
  }
  return [`błąd pola ${field || "wyniku"}: ${issue.message}`];
}

/** Waliduje gotowy obiekt. Niczego nie poprawia ani nie uzupełnia. */
export function validateAnalysis(raw: unknown): ValidationResult {
  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.flatMap((i) => describeIssue(i, raw));
    return {
      ok: false,
      kind: "validation",
      message: "Wynik modelu nie pasuje do schematu analizy.",
      issues,
    };
  }
  if (parsed.data.draft.trim() === "") {
    return {
      ok: false,
      kind: "validation",
      message: "Wynik modelu nie pasuje do schematu analizy.",
      issues: ["pole draft jest puste"],
    };
  }
  return { ok: true, analysis: parsed.data };
}

/** Waliduje surowy tekst modelu (JSON). */
export function validateAnalysisText(text: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      kind: "refusal",
      message:
        "Model odpowiedział tekstem zamiast danych analizy (np. odmówił). Spróbuj przeformułować wiadomość albo przekaż ją pracownikowi.",
      issues: [],
    };
  }
  return validateAnalysis(raw);
}

/**
 * Opisuje nieudaną odpowiedź modelu na podstawie powodu zakończenia i tekstu.
 * Używane, gdy SDK nie zwróciło poprawnego obiektu.
 */
export function classifyModelFailure(
  finishReason: string | undefined,
  text: string | undefined,
): ValidationResult {
  if (finishReason === "length") {
    return {
      ok: false,
      kind: "interrupted",
      message:
        "Odpowiedź modelu została przerwana (limit długości). Wynik jest niepełny i nie został użyty.",
      issues: [],
    };
  }
  if (finishReason === "content-filter") {
    return {
      ok: false,
      kind: "refusal",
      message: "Model odmówił odpowiedzi (filtr treści). Przekaż wiadomość pracownikowi.",
      issues: [],
    };
  }
  if (!text || text.trim() === "") {
    return {
      ok: false,
      kind: "interrupted",
      message: "Model nie zwrócił żadnej treści. Spróbuj ponownie.",
      issues: [],
    };
  }
  const result = validateAnalysisText(text);
  if (result.ok) {
    // SDK uznało wynik za błędny, więc nie traktujemy go jako poprawnego.
    return {
      ok: false,
      kind: "validation",
      message: "Model nie zakończył poprawnie odpowiedzi. Wynik nie został użyty.",
      issues: [],
    };
  }
  return result;
}

/** Komunikat dla błędu dostawcy (APICallError) na podstawie statusu i treści. */
export function classifyProviderError(
  status: number | undefined,
  body: string | undefined,
): ValidationResult {
  const text = (body ?? "").toLowerCase();
  if (
    text.includes("response_format") ||
    text.includes("structured") ||
    text.includes("json_schema") ||
    text.includes("no endpoints found")
  ) {
    return {
      ok: false,
      kind: "config",
      message:
        "Ustawiony model (OPENROUTER_MODEL) albo jego dostawcy nie obsługują structured output. Wybierz model z obsługą „structured_outputs” na openrouter.ai/models i ustaw go w OPENROUTER_MODEL. Uzgodnij koszt przed zmianą.",
      issues: [],
    };
  }
  const byStatus: Record<number, string> = {
    401: "Dostawca odrzucił klucz API. Sprawdź OPENROUTER_API_KEY.",
    402: "Brak środków na koncie OpenRouter.",
    404: "Nie znaleziono modelu. Sprawdź OPENROUTER_MODEL.",
    429: "Za dużo zapytań do dostawcy. Spróbuj za chwilę.",
  };
  return {
    ok: false,
    kind: "provider",
    message:
      (status && byStatus[status]) ||
      "Błąd dostawcy modelu. Spróbuj ponownie za chwilę.",
    issues: [],
  };
}
