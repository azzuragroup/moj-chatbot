// Testy katalogu produktów i linków w czacie. Nie wywołują modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUKTY, szukajProduktow } from "../lib/catalogData.ts";
import { splitLinks } from "../components/links.ts";

test("katalog: 36 produktów z unikalnymi linkami do azzuragroup.com", () => {
  assert.equal(PRODUKTY.length, 36);
  const linki = new Set(PRODUKTY.map((p) => p.link));
  assert.equal(linki.size, 36);
  for (const p of PRODUKTY) assert.match(p.link, /^https:\/\/azzuragroup\.com\/produkty\/[a-z0-9-]+\/$/, p.nazwa);
});

test("katalog: bez cen i bez pustych pól", () => {
  for (const p of PRODUKTY) {
    const tekst = JSON.stringify(p);
    assert.doesNotMatch(tekst, /\d\s?(zł|pln|€|eur)\b|\bcena\b|\bceny\b/i, p.nazwa);
    for (const pole of ["formaty", "grubosci", "zastosowania", "cechy"]) {
      assert.ok(p[pole].length > 0, `${p.nazwa}: ${pole}`);
    }
    assert.ok(p.opis.length > 20, p.nazwa);
  }
  const dragonwood = PRODUKTY.find((p) => p.slug === "dragonwood");
  assert.deepEqual(dragonwood.formaty, ["brak danych na stronie"]);
});

test("wyszukiwanie po nazwie, marce i zastosowaniu", () => {
  const pierwszy = (q) => szukajProduktow(q)[0]?.slug;
  assert.equal(pierwszy("BoardeX"), "plyta-boardex");
  assert.equal(pierwszy("Fibrex A1"), "fibrex");
  assert.equal(pierwszy("panele akustyczne do szpitala"), "tromer-mediceil");
  assert.equal(pierwszy("masa szpachlowa do łazienki"), "handycoat-washable");
  assert.equal(pierwszy("sklejka antypoślizgowa"), "sklejka-hexa");
  assert.ok(szukajProduktow("ogrzewanie podłogowe").some((p) => p.slug === "azzura-thermofloor"));
  assert.ok(szukajProduktow("sufit do biura").slice(0, 3).every((p) => p.marka === "Tromer"));
  assert.deepEqual(szukajProduktow("pogoda w Krakowie"), []);
  assert.deepEqual(szukajProduktow(""), []);
  assert.ok(szukajProduktow("płyta").length <= 5);
});

test("linki w czacie: [opis](https) i gołe adresy, bez javascript:", () => {
  assert.deepEqual(splitLinks("Zobacz [Płyta BoardeX](https://azzuragroup.com/produkty/plyta-boardex/)."), [
    { text: "Zobacz " },
    { text: "Płyta BoardeX", href: "https://azzuragroup.com/produkty/plyta-boardex/" },
    { text: "." },
  ]);
  assert.deepEqual(splitLinks("Więcej: https://azzuragroup.com/produkty/fibrex/."), [
    { text: "Więcej: " },
    { text: "https://azzuragroup.com/produkty/fibrex/", href: "https://azzuragroup.com/produkty/fibrex/" },
    { text: "." },
  ]);
  assert.deepEqual(splitLinks("[klik](javascript:alert(1))"), [{ text: "[klik](javascript:alert(1))" }]);
  assert.deepEqual(splitLinks("Bez linków."), [{ text: "Bez linków." }]);
});
