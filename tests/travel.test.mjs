// Testy asystenta podróży: funkcje pomocnicze i wyszukiwanie miejscowości. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, currencyForCountry, differenceFromPoland, firstSentences, upcomingHolidays, utcOffsetMinutes } from "../lib/travelHelpers.ts";
import { geocodeCity } from "../lib/weather.ts";

test("waluta kraju", () => {
  assert.equal(currencyForCountry("CZ"), "CZK");
  assert.equal(currencyForCountry("pt"), "EUR");
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("XX"), undefined);
  assert.equal(currencyForCountry(undefined), undefined);
});

test("różnica czasu względem Polski (zima i lato)", () => {
  const winter = new Date("2026-11-17T12:00:00Z");
  assert.equal(utcOffsetMinutes("Europe/Warsaw", winter), 60);
  assert.equal(differenceFromPoland("Europe/Prague", winter).opis, "tak samo jak w Polsce");
  assert.equal(differenceFromPoland("Europe/Lisbon", winter).opis, "−1 h względem Polski");
  assert.equal(differenceFromPoland("Asia/Tokyo", winter).opis, "+8 h względem Polski");
  assert.equal(differenceFromPoland("Asia/Kolkata", winter).opis, "+4 h 30 min względem Polski");
  const summer = new Date("2026-07-01T12:00:00Z");
  assert.equal(differenceFromPoland("Asia/Tokyo", summer).opis, "+7 h względem Polski");
  assert.equal(differenceFromPoland("America/New_York", summer).opis, "−6 h względem Polski");
});

test("dwa pierwsze zdania", () => {
  const t = "Praga – stolica Czech. Leży nad Wełtawą. Ma ponad milion mieszkańców.";
  assert.equal(firstSentences(t), "Praga – stolica Czech. Leży nad Wełtawą.");
  assert.equal(firstSentences("Jedno zdanie bez kropki"), "Jedno zdanie bez kropki");
});

test("najbliższe święta od dnia podróży, bez powtórzeń dat", () => {
  const list = [
    { data: "2026-12-26", nazwa: "Drugi dzień świąt" },
    { data: "2026-11-11", nazwa: "Niepodległości" },
    { data: "2026-12-25", nazwa: "Boże Narodzenie" },
    { data: "2026-12-25", nazwa: "Boże Narodzenie (duplikat)" },
    { data: "2027-01-01", nazwa: "Nowy Rok" },
  ];
  assert.deepEqual(upcomingHolidays(list, "2026-11-20").map((h) => h.data), ["2026-12-25", "2026-12-26", "2027-01-01"]);
  assert.equal(upcomingHolidays(list, "2026-11-11")[0].nazwa, "Niepodległości", "święto w dniu podróży się liczy");
});

test("dodawanie dni przez koniec roku", () => {
  assert.equal(addDays("2026-12-25", 15), "2027-01-09");
});

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("wyszukanie miejscowości zwraca kraj, kod kraju i strefę", async () => {
  const geo = { results: [{ name: "Praga", latitude: 50.08, longitude: 14.42, country: "Czechy", admin1: "Praga", country_code: "CZ", timezone: "Europe/Prague" }] };
  const r = await geocodeCity("Praga", async () => json(geo));
  assert.deepEqual(r, { ok: true, place: { nazwa: "Praga", region: "Praga", kraj: "Czechy", kodKraju: "CZ", strefaCzasowa: "Europe/Prague" } });
  const none = await geocodeCity("Xqzw", async () => json({}));
  assert.match(none.blad, /Nie znaleziono miejscowości/);
  const down = await geocodeCity("Praga", async () => { throw new Error("offline"); });
  assert.match(down.blad, /Źródło nie odpowiada/);
});

import { completeSentences, endsWithSentence } from "../lib/travelHelpers.ts";

test("urwany tekst nie przechodzi jako pełne podsumowanie", () => {
  assert.equal(endsWithSentence("Na wyjazd do Lizbony warto spakować"), false);
  assert.equal(endsWithSentence("Weź parasol."), true);
  assert.equal(completeSentences("Na wyjazd do Lizbony warto spakować"), "", "same urwane zdanie → nic");
  assert.equal(
    completeSentences("Weź parasol i lekką kurtkę. Uważaj na święto 8 grudnia. Sklepy mogą być zamknięte. Czwarte zdanie."),
    "Weź parasol i lekką kurtkę. Uważaj na święto 8 grudnia. Sklepy mogą być zamknięte.",
    "najwyżej 3 zdania",
  );
  assert.equal(completeSentences("Weź parasol. Uważaj na kurs euro i"), "Weź parasol.", "urwane ostatnie zdanie odrzucone");
});
