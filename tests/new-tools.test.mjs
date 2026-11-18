// Testy nowych narzędzi na danych lokalnych. Nie łączą się z internetem ani z modelem.
import assert from "node:assert/strict";
import { test } from "node:test";
import { getCurrency, waluty } from "../lib/currency.ts";
import { getHolidays, swieta } from "../lib/holidays.ts";
import { getWikipediaSummary } from "../lib/wikipedia.ts";
import { calculate, kalkulator } from "../lib/calculator.ts";
import { createNoteStore, MAX_NOTES } from "../lib/notes.ts";
import { diagnosticsReport, envStatus } from "../lib/diagnostics.ts";

const NOW = () => new Date("2026-11-16T10:00:00Z");
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
function fakeFetch(responses) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { fn, calls };
}

// --- waluty ---
const EUR = { table: "A", currency: "euro", code: "EUR", rates: [{ no: "222/A/NBP/2026", effectiveDate: "2026-11-16", mid: 4.4048 }] };

test("waluty: kurs i przeliczenie na złote, tylko potrzebne pola", async () => {
  const { fn, calls } = fakeFetch([json(EUR)]);
  const r = await getCurrency("eur", 100, "na_zlote", fn, NOW);
  assert.deepEqual(r, {
    waluta: "euro", kod: "EUR", kursSredniPLN: 4.4048, tabelaNBP: "222/A/NBP/2026", dataKursu: "2026-11-16",
    przeliczenie: { kwota: 100, z: "EUR", wynik: 440.48, na: "PLN" },
    zrodlo: "Narodowy Bank Polski, kurs średni (api.nbp.pl)", pobrano: "2026-11-16T10:00:00.000Z",
  });
  assert.equal(calls[0], "https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json");
});

test("waluty: przeliczenie ze złotych", async () => {
  const { fn } = fakeFetch([json(EUR)]);
  const r = await getCurrency("EUR", 1000, "ze_zlotych", fn, NOW);
  assert.deepEqual(r.przeliczenie, { kwota: 1000, z: "PLN", wynik: 227.03, na: "EUR" });
});

test("waluty: brak w tabeli A → szuka w tabeli B", async () => {
  const afn = { table: "B", currency: "afgani", code: "AFN", rates: [{ no: "045/B/NBP/2026", effectiveDate: "2026-11-10", mid: 0.059762 }] };
  const { fn, calls } = fakeFetch([new Response("", { status: 404 }), json(afn)]);
  const r = await getCurrency("AFN", undefined, "na_zlote", fn, NOW);
  assert.equal(r.kod, "AFN");
  assert.match(calls[1], /rates\/b\/afn/);
});

test("waluty: nieznana waluta, PLN i błędny kod – komunikaty po polsku", async () => {
  const { fn } = fakeFetch([new Response("", { status: 404 }), new Response("", { status: 404 })]);
  assert.match((await getCurrency("XYZ", undefined, "na_zlote", fn, NOW)).blad, /nie publikuje kursu waluty o kodzie XYZ/);
  assert.match((await getCurrency("PLN", undefined, "na_zlote", fn, NOW)).blad, /złoty/);
  assert.match((await getCurrency("euro", undefined, "na_zlote", fn, NOW)).blad, /trzy litery/);
});

test("waluty: serwis nie odpowiada", async () => {
  const { fn } = fakeFetch([new Error("timeout"), new Error("timeout")]);
  const r = await getCurrency("EUR", undefined, "na_zlote", fn, NOW);
  assert.match(r.blad, /nie odpowiada/);
  assert.equal(waluty.inputSchema.safeParse({ waluta: "EUR", kwota: -5 }).success, false);
});

// --- święta ---
test("święta: lista z wybranymi polami", async () => {
  const body = [{ date: "2026-11-11", localName: "Narodowe Święto Niepodległości", name: "Independence Day", countryCode: "PL", fixed: false, global: true, counties: null, launchYear: null, types: ["Public"] }];
  const { fn, calls } = fakeFetch([json(body)]);
  const r = await getHolidays("pl", 2026, fn, NOW);
  assert.deepEqual(r.swieta, [{ data: "2026-11-11", nazwa: "Narodowe Święto Niepodległości", nazwaAngielska: "Independence Day", wCalymKraju: true, rodzaj: ["Public"] }]);
  assert.equal(r.liczba, 1);
  assert.equal(r.pobrano, "2026-11-16T10:00:00.000Z");
  assert.equal(calls[0], "https://date.nager.at/api/v3/PublicHolidays/2026/PL");
});

test("święta: nieznany kraj i awaria serwisu", async () => {
  const a = fakeFetch([new Response("", { status: 404 })]);
  assert.match((await getHolidays("XX", 2026, a.fn, NOW)).blad, /Brak danych o świętach dla kraju o kodzie XX/);
  const b = fakeFetch([new Error("offline")]);
  assert.match((await getHolidays("PL", 2026, b.fn, NOW)).blad, /nie odpowiada/);
  assert.equal(swieta.inputSchema.safeParse({ kraj: "Polska", rok: 2026 }).success, false);
});

// --- Wikipedia ---
test("wikipedia: wyszukanie, streszczenie i link", async () => {
  const search = { query: { search: [{ title: "Rzeszów" }] } };
  const summary = { type: "standard", title: "Rzeszów", description: "miasto w Polsce", extract: "Rzeszów – miasto.", content_urls: { desktop: { page: "https://pl.wikipedia.org/wiki/Rzesz%C3%B3w" } }, thumbnail: {} };
  const { fn, calls } = fakeFetch([json(search), json(summary)]);
  const r = await getWikipediaSummary("Rzeszów", fn, NOW);
  assert.deepEqual(r, {
    tytul: "Rzeszów", opis: "miasto w Polsce", streszczenie: "Rzeszów – miasto.",
    link: "https://pl.wikipedia.org/wiki/Rzesz%C3%B3w", ujednoznacznienie: false,
    zrodlo: "Wikipedia, wolna encyklopedia (pl.wikipedia.org), licencja CC BY-SA", pobrano: "2026-11-16T10:00:00.000Z",
  });
  assert.match(calls[1], /page\/summary\/Rzesz%C3%B3w$/);
});

test("wikipedia: brak hasła i awaria", async () => {
  const a = fakeFetch([json({ query: { search: [] } })]);
  assert.match((await getWikipediaSummary("qwzx", a.fn, NOW)).blad, /nie ma hasła/);
  const b = fakeFetch([new Error("offline")]);
  assert.match((await getWikipediaSummary("Rzeszów", b.fn, NOW)).blad, /nie odpowiada/);
});

// --- kalkulator ---
test("kalkulator: działania i brak błędów zaokrągleń", () => {
  const now = new Date("2026-11-16T10:00:00Z");
  assert.equal(calculate("dodaj", [0.1, 0.2], now).wynik, 0.3);
  assert.equal(calculate("odejmij", [10, 3, 2], now).wynik, 5);
  assert.equal(calculate("pomnoz", [12, 180], now).wynik, 2160);
  assert.equal(calculate("podziel", [20, 4], now).wynik, 5);
  assert.equal(calculate("potega", [2, 10], now).wynik, 1024);
  assert.equal(calculate("pierwiastek", [81], now).wynik, 9);
  assert.equal(calculate("procent", [23, 200], now).wynik, 46);
  assert.equal(calculate("srednia", [1, 2, 3, 4], now).wynik, 2.5);
  assert.equal(calculate("pomnoz", [1.1, 7], now).zapis, "1,1 × 7 = 7,7");
});

test("kalkulator: dzielenie przez zero, zła liczba argumentów, kod zamiast liczb", () => {
  assert.match(calculate("podziel", [1, 0]).blad, /przez zero/);
  assert.match(calculate("pierwiastek", [-4]).blad, /ujemnej/);
  assert.match(calculate("podziel", [1, 2, 3]).blad, /potrzebuje 2 liczb/);
  assert.equal(kalkulator.inputSchema.safeParse({ dzialanie: "dodaj", liczby: ["process.exit()"] }).success, false);
  assert.equal(kalkulator.inputSchema.safeParse({ dzialanie: "eval", liczby: [1] }).success, false);
});

// --- notatki ---
test("notatki: zapis, odczyt, pusta notatka i limit", () => {
  const store = createNoteStore();
  const now = new Date("2026-11-16T10:00:00Z");
  assert.match(store.add("   ", now).blad, /pusta/);
  const saved = store.add("Post o Dragonwood w piątek", now);
  assert.deepEqual(saved.zapisano, { id: 1, tresc: "Post o Dragonwood w piątek", utworzono: "2026-11-16T10:00:00.000Z" });
  assert.equal(store.list(now).liczbaNotatek, 1);
  for (let i = 0; i < MAX_NOTES + 5; i++) store.add(`n${i}`, now);
  const list = store.list(now);
  assert.equal(list.liczbaNotatek, MAX_NOTES);
  assert.equal(list.notatki.at(-1).tresc, `n${MAX_NOTES + 4}`);
});

// --- diagnostyka ---
test("diagnostyka: tylko tak/nie, nigdy wartości zmiennych", () => {
  const env = { OPENROUTER_API_KEY: "sk-or-TAJNE", OPENROUTER_MODEL: "x/y", CHAT_PASSWORD: "", SESSION_SECRET: undefined };
  assert.deepEqual(envStatus(env), {
    OPENROUTER_API_KEY: "tak", OPENROUTER_MODEL: "tak", CHAT_PASSWORD: "nie", SESSION_SECRET: "nie",
    SUPABASE_URL: "nie", SUPABASE_SECRET_KEY: "nie",
  });
  const r = diagnosticsReport({ modelId: "x/y", toolNames: ["czas", "diagnostyka"], maxSteps: 5 }, env, new Date("2026-11-16T10:00:00Z"));
  assert.doesNotMatch(JSON.stringify(r), /TAJNE/);
  assert.equal(r.limitKrokow, 5);
  assert.deepEqual(r.narzedzia, ["czas", "diagnostyka"]);
});
