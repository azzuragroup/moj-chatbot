// Testy kolejności narzędzi i limitu kroków. Nie wywołują modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_STEPS, hitStepLimit } from "../lib/steps.ts";
import { collectSources, toolSequence } from "../components/toolSequence.ts";

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

test("limit kroków: tylko gdy wszystkie kroki zużyte i agent chciał dalej", () => {
  assert.equal(MAX_STEPS, 5);
  assert.equal(hitStepLimit(5, "tool-calls"), true);
  assert.equal(hitStepLimit(5, "stop"), false, "zwykła odpowiedź w 5. kroku");
  assert.equal(hitStepLimit(3, "tool-calls"), false);
  assert.equal(hitStepLimit(5, undefined), false);
});

test("źródła: bez powtórzeń i tylko linki http(s)", () => {
  const parts = [
    { type: "source-url", url: "https://nbp.pl", title: "NBP" },
    { type: "source-url", url: "https://nbp.pl", title: "NBP" },
    { type: "source-url", url: "javascript:alert(1)" },
  ];
  assert.deepEqual(collectSources(parts), { sources: [{ url: "https://nbp.pl", title: "NBP" }] });
});
