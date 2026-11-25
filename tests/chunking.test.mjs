// Testy podziału dokumentu na fragmenty bazy wiedzy. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_CHUNK, chunksLabel, embeddingFailure, formatVersion, sameTitle, splitIntoChunks, toSearchResults } from "../lib/chunkingCore.ts";

test("błąd embeddingów: komunikat po polsku i podpowiedź, co zrobić", () => {
  for (const [status, name, fragment] of [
    [401, undefined, "klucz API"],
    [402, undefined, "środków"],
    [404, undefined, "modelu embeddingów"],
    [429, undefined, "Za dużo zapytań"],
    [undefined, "TimeoutError", "na czas"],
    [500, undefined, "Nie udało się utworzyć embeddingów"],
  ]) {
    const { message, hint } = embeddingFailure(status, name);
    assert.ok(message.includes(fragment), message);
    assert.ok(message.includes("Dokument nie został dodany."), message);
    assert.ok(hint.length > 10, "jest podpowiedź");
  }
});

test("wyniki wyszukiwania: 3 fragmenty, tytuł, treść, podobieństwo; bez pustych embeddingów", () => {
  const rows = [
    { title: "Cennik", content: "Pakiet Start kosztuje 490 zł netto miesięcznie.", similarity: 0.61234 },
    { title: "Regulamin", content: "Umowę można wypowiedzieć z miesięcznym wyprzedzeniem.", similarity: 0.4 },
    { title: "Stary", content: "bez embeddingu", similarity: null },
    { title: "O firmie", content: "Agent rozmawia po polsku i po angielsku.", similarity: 0.31 },
    { title: "Czwarty", content: "nadmiarowy", similarity: 0.2 },
  ];
  assert.deepEqual(toSearchResults(rows, 0), [
    { tytul: "Cennik", tresc: "Pakiet Start kosztuje 490 zł netto miesięcznie.", podobienstwo: 0.612 },
    { tytul: "Regulamin", tresc: "Umowę można wypowiedzieć z miesięcznym wyprzedzeniem.", podobienstwo: 0.4 },
    { tytul: "O firmie", tresc: "Agent rozmawia po polsku i po angielsku.", podobienstwo: 0.31 },
  ]);
  assert.deepEqual(toSearchResults(null), []);
});

test("ten sam tytuł mimo innej wielkości liter i odstępów", () => {
  assert.ok(sameTitle("Cennik  pakietów", " cennik pakietów "));
  assert.ok(sameTitle("ŁÓDŹ", "łódź"));
  assert.ok(!sameTitle("Cennik 2025", "Cennik 2026"));
});

test("wersja dokumentu to data w czasie polskim", () => {
  const v = formatVersion("2026-11-25T13:05:00Z");
  assert.ok(v.includes("25 listopada 2026"), v);
  assert.ok(v.includes("14:05"), v);
});

test("jeden akapit = jeden fragment, krótkie akapity nie są łączone", () => {
  const text = "Pakiet Start kosztuje 490 zł.\n\nPakiet Pro kosztuje 990 zł.\n\nKontakt: biuro.";
  assert.deepEqual(splitIntoChunks(text), ["Pakiet Start kosztuje 490 zł.", "Pakiet Pro kosztuje 990 zł.", "Kontakt: biuro."]);
});

test("pojedynczy enter nie dzieli akapitu, puste linie i spacje są pomijane", () => {
  const text = "  Linia pierwsza\nlinia druga  \r\n \r\n\n\nDrugi akapit\n\n   \n";
  assert.deepEqual(splitIntoChunks(text), ["Linia pierwsza\nlinia druga", "Drugi akapit"]);
});

test("długi akapit dzielony na granicy zdania, każdy kawałek ≤ 800 znaków", () => {
  const sentence = "To jest zdanie testowe o płycie BoardeX, które ma sporo słów. ";
  const paragraph = sentence.repeat(40).trim(); // ok. 2500 znaków
  const chunks = splitIntoChunks(paragraph);
  assert.ok(chunks.length >= 3);
  for (const c of chunks) {
    assert.ok(c.length <= MAX_CHUNK, `za długi fragment: ${c.length}`);
    assert.ok(c.endsWith("."), "fragment kończy się na końcu zdania");
  }
  assert.equal(chunks.join(" "), paragraph, "nic nie zginęło");
});

test("zdanie dłuższe niż limit też jest pocięte", () => {
  const chunks = splitIntoChunks("słowo ".repeat(300).trim());
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((c) => c.length <= MAX_CHUNK));
});

test("pusta treść = brak fragmentów", () => {
  assert.deepEqual(splitIntoChunks("   \n\n  "), []);
});

test("odmiana słowa fragment", () => {
  assert.equal(chunksLabel(1), "1 fragment");
  assert.equal(chunksLabel(3), "3 fragmenty");
  assert.equal(chunksLabel(5), "5 fragmentów");
  assert.equal(chunksLabel(12), "12 fragmentów");
  assert.equal(chunksLabel(22), "22 fragmenty");
});

test("stałe kawałki: 300 znaków z zakładką 50, nic nie ginie", async () => {
  const { splitFixed, splitByMode } = await import("../lib/chunkingCore.ts");
  const text = Array.from({ length: 700 }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");
  const chunks = splitFixed(text);
  assert.deepEqual(chunks.map((c) => c.length), [300, 300, 200]);
  assert.equal(chunks[1].slice(0, 50), chunks[0].slice(-50), "zakładka 50 znaków");
  assert.equal(chunks[2].slice(0, 50), chunks[1].slice(-50));
  assert.equal(chunks[0] + chunks[1].slice(50) + chunks[2].slice(50), text, "po zdjęciu zakładek wychodzi cały tekst");
  assert.deepEqual(splitFixed("krótki tekst"), ["krótki tekst"]);
  assert.deepEqual(splitFixed("   "), []);
  assert.deepEqual(splitByMode("A.\n\nB."), ["A.", "B."], "domyślnie akapity");
  assert.equal(splitByMode("x".repeat(600), "stale").length, 3);
});
