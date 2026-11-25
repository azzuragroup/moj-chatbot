// Źródła z bazy wiedzy pod odpowiedzią: tylko cytowane dokumenty, bez powtórzeń. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { citedTitles, knowledgeSources, percent } from "../components/knowledgeSources.ts";
import { MIN_SIMILARITY, toSearchResults } from "../lib/chunkingCore.ts";

const tool = (fragmenty) => ({ type: "tool-searchKnowledge", state: "output-available", output: { fragmenty } });
const start = { tytul: "Cennik 2026", tresc: "Pakiet Start kosztuje 490 zł netto miesięcznie.", podobienstwo: 0.551 };
const zespol = { tytul: "Cennik 2026", tresc: "Pakiet Zespół kosztuje 1290 zł netto miesięcznie.", podobienstwo: 0.533 };
const faq = { tytul: "FAQ", tresc: "Czy mogę zmienić pakiet? Tak.", podobienstwo: 0.51 };

test("tytuły z linii Źródło (z pogrubieniem, cudzysłowem, kilka dokumentów)", () => {
  assert.deepEqual(citedTitles("Tekst.\n\n📎 Źródło: Cennik 2026"), ["Cennik 2026"]);
  assert.deepEqual(citedTitles("📎 **Źródło:** „Cennik 2026”, FAQ"), ["Cennik 2026", "FAQ"]);
  assert.deepEqual(citedTitles("📎 Źródło: [Cennik 2026]"), ["Cennik 2026"]);
  assert.deepEqual(citedTitles("Nie mam tej informacji w bazie wiedzy."), []);
});

test("pokazuje tylko fragmenty z cytowanych dokumentów, od najlepszego", () => {
  const parts = [tool([start, zespol, faq]), { type: "text", text: "Najtańszy jest Start: 490 zł.\n\n📎 Źródło: Cennik 2026" }];
  assert.deepEqual(
    knowledgeSources(parts).map((s) => s.content),
    [start.tresc, zespol.tresc],
  );
});

test("bez linii Źródło – brak listy źródeł", () => {
  const parts = [tool([start]), { type: "text", text: "Nie mam tej informacji w bazie wiedzy." }];
  assert.deepEqual(knowledgeSources(parts), []);
});

test("ten sam fragment z dwóch wyszukiwań pokazany raz; wielkość liter w tytule bez znaczenia", () => {
  const parts = [tool([start]), tool([start, faq]), { type: "text", text: "…\n📎 Źródło: cennik 2026, faq" }];
  assert.equal(knowledgeSources(parts).length, 2);
});

test("narzędzie jeszcze pracuje albo zwróciło błąd – nic nie pokazujemy", () => {
  const parts = [
    { type: "tool-searchKnowledge", state: "input-available" },
    { type: "tool-searchKnowledge", state: "output-available", output: { blad: "x" } },
    { type: "text", text: "📎 Źródło: Cennik 2026" },
  ];
  assert.deepEqual(knowledgeSources(parts), []);
});

test("procenty", () => {
  assert.equal(percent(0.551), "55%");
  assert.equal(percent(0.5), "50%");
});

test("próg: fragmenty poniżej MIN_SIMILARITY nie są źródłem", () => {
  const rows = [
    { title: "Cennik 2026", content: "Start 490 zł", similarity: MIN_SIMILARITY + 0.05 },
    { title: "FAQ", content: "Zmiana pakietu", similarity: MIN_SIMILARITY - 0.01 },
  ];
  assert.deepEqual(toSearchResults(rows).map((r) => r.tytul), ["Cennik 2026"]);
});
