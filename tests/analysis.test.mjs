// Testy walidacji analizy na danych lokalnych. Nie wywołują modelu.
// Uruchomienie: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { zodSchema } from "ai";
import {
  analysisSchema,
  enforceReviewRules,
  classifyModelFailure,
  classifyProviderError,
  validateAnalysis,
  validateAnalysisText,
} from "../lib/analysis.ts";

const valid = {
  category: "zapytanie_ofertowe",
  priority: "normal",
  draft: "Dziękuję za wiadomość.",
  needs_review: true,
};

function rejected(result, kind, issue) {
  assert.equal(result.ok, false);
  assert.equal(result.kind, kind);
  if (issue) assert.ok(result.issues.includes(issue), JSON.stringify(result.issues));
}

test("schemat wysyłany do modelu zgadza się ze schematem z materiałów", async () => {
  const { $schema, ...schema } = await zodSchema(analysisSchema).jsonSchema;
  assert.deepEqual(schema, {
    type: "object",
    properties: {
      category: { type: "string", enum: ["zapytanie_ofertowe", "produkt", "reklamacja_dostawa", "inne"] },
      priority: { type: "string", enum: ["normal", "high"] },
      draft: { type: "string" },
      needs_review: { type: "boolean" },
    },
    required: ["category", "priority", "draft", "needs_review"],
    additionalProperties: false,
  });
});

test("poprawny wynik przechodzi bez zmian", () => {
  assert.deepEqual(validateAnalysis(valid), { ok: true, analysis: valid });
});

test("1. brak pola draft jest odrzucany", () => {
  const { draft, ...noDraft } = valid;
  rejected(validateAnalysis(noDraft), "validation", "brak pola: draft");
});

test('2. needs_review jako tekst "false" jest odrzucany', () => {
  rejected(
    validateAnalysis({ ...valid, needs_review: "false" }),
    "validation",
    "zły typ pola needs_review: oczekiwano boolean",
  );
});

test("3. kategoria marketing jest odrzucana", () => {
  rejected(
    validateAnalysis({ ...valid, category: "marketing" }),
    "validation",
    "niedozwolona wartość pola category",
  );
});

test("4. dodatkowe pole send_now jest odrzucane", () => {
  rejected(
    validateAnalysis({ ...valid, send_now: true }),
    "validation",
    "niedozwolone dodatkowe pole: send_now",
  );
});

test("pusty szkic jest odrzucany", () => {
  rejected(validateAnalysis({ ...valid, draft: "  " }), "validation", "pole draft jest puste");
});

test("odmowa modelu (tekst zamiast JSON) nie daje wyniku", () => {
  rejected(validateAnalysisText("Przepraszam, nie mogę pomóc."), "refusal");
  rejected(classifyModelFailure("content-filter", ""), "refusal");
});

test("przerwana odpowiedź nie daje wyniku, nawet z poprawnym początkiem", () => {
  rejected(classifyModelFailure("length", '{"category":"produkt","priority"'), "interrupted");
  rejected(classifyModelFailure("other", ""), "interrupted");
});

test("poprawny JSON przy błędzie SDK nie jest traktowany jako sukces", () => {
  rejected(classifyModelFailure("other", JSON.stringify(valid)), "validation");
});

test("błąd dostawcy i brak obsługi structured output", () => {
  rejected(classifyProviderError(500, "upstream error"), "provider");
  rejected(classifyProviderError(429, ""), "provider");
  rejected(
    classifyProviderError(404, "No endpoints found that can handle the requested parameters."),
    "config",
  );
});

test("zapytanie ofertowe i reklamacja zawsze wymagają sprawdzenia", () => {
  const base = { priority: "normal", draft: "Dziękujemy.", needs_review: false };
  assert.equal(enforceReviewRules({ ...base, category: "zapytanie_ofertowe" }).needs_review, true);
  assert.equal(enforceReviewRules({ ...base, category: "reklamacja_dostawa" }).needs_review, true);
  assert.equal(enforceReviewRules({ ...base, category: "produkt" }).needs_review, false);
  assert.equal(enforceReviewRules({ ...base, category: "inne" }).needs_review, false);
});
