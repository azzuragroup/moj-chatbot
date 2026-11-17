// Testy kolejności narzędzi i limitu kroków. Nie wywołują modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { LIMIT_INSTRUCTION, MAX_STEPS, hitStepLimit, isLastStep } from "../lib/steps.ts";
import { collectSources, stepSequence, toolSequence } from "../components/toolSequence.ts";

test("etykiety narzędzi idą w kolejności użycia", () => {
  const parts = [
    { type: "step-start" },
    { type: "tool-pogoda" },
    { type: "step-start" },
    { type: "source-url" },
    { type: "source-url" },
    { type: "tool-generujObraz" },
    { type: "text" },
  ];
  assert.deepEqual(toolSequence(parts), ["pogoda", "web_search", "generujObraz"]);
});

test("to samo narzędzie pod rząd liczymy raz, ale powrót do niego pokazujemy", () => {
  const parts = [{ type: "tool-pogoda" }, { type: "tool-pogoda" }, { type: "tool-aktualnyCzas" }, { type: "tool-pogoda" }];
  assert.deepEqual(toolSequence(parts), ["pogoda", "aktualnyCzas", "pogoda"]);
});

test("bez narzędzi nic nie pokazujemy", () => {
  assert.deepEqual(toolSequence([{ type: "text" }, { type: "step-start" }]), []);
});

test("limit kroków: 6, zapasowe sprawdzenie tylko gdy agent chciał dalej", () => {
  assert.equal(MAX_STEPS, 6);
  assert.equal(hitStepLimit(6, "tool-calls"), true);
  assert.equal(hitStepLimit(6, "stop"), false, "zwykła odpowiedź w 6. kroku");
  assert.equal(hitStepLimit(3, "tool-calls"), false);
  assert.equal(hitStepLimit(6, undefined), false);
});

test("ostatni krok (numer 5 liczony od 0) wymusza podsumowanie bez narzędzi", () => {
  assert.equal(isLastStep(4), false);
  assert.equal(isLastStep(5), true);
  assert.match(LIMIT_INSTRUCTION, /Nie używaj już narzędzi/);
  assert.match(LIMIT_INSTRUCTION, /co udało się ustalić/);
});

test("kroki: numer kroku modelu i narzędzia w nim, bez kroku z samym tekstem", () => {
  const parts = [
    { type: "step-start" }, { type: "tool-pogoda" },
    { type: "step-start" }, { type: "tool-waluty" }, { type: "tool-swieta" }, { type: "tool-waluty" },
    { type: "step-start" }, { type: "tool-kalkulator" },
    { type: "step-start" }, { type: "text" },
  ];
  assert.deepEqual(stepSequence(parts), [
    { step: 1, tools: ["pogoda"] },
    { step: 2, tools: ["waluty", "swieta"] },
    { step: 3, tools: ["kalkulator"] },
  ]);
});

test("kroki: wyszukiwanie rozpoznane po źródłach, brak step-start liczony jako krok 1", () => {
  assert.deepEqual(stepSequence([{ type: "source-url" }, { type: "text" }]), [{ step: 1, tools: ["web_search"] }]);
  assert.deepEqual(stepSequence([{ type: "text" }]), []);
});

test("źródła: bez powtórzeń i tylko linki http(s)", () => {
  const parts = [
    { type: "source-url", url: "https://nbp.pl", title: "NBP" },
    { type: "source-url", url: "https://nbp.pl", title: "NBP" },
    { type: "source-url", url: "javascript:alert(1)" },
  ];
  assert.deepEqual(collectSources(parts), { sources: [{ url: "https://nbp.pl", title: "NBP" }] });
});
