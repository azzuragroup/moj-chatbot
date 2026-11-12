// Testy narzędzia pogoda na danych lokalnych. Nie łączą się z internetem.
import assert from "node:assert/strict";
import { test } from "node:test";
import { describeWeatherCode, getWeather, pogoda } from "../lib/weather.ts";

const NOW = () => new Date("2026-11-10T18:45:00Z");
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const GEO = {
  results: [{ name: "Warszawa", latitude: 52.23, longitude: 21.01, country: "Polska", admin1: "Województwo mazowieckie", population: 1700000 }],
};
const FORECAST = {
  latitude: 52.23,
  elevation: 100,
  current: { time: "2026-11-10T19:45", interval: 900, temperature_2m: 1.2, apparent_temperature: -2.6, precipitation: 0.1, weather_code: 51, wind_speed_10m: 11.5 },
  daily: {
    time: ["2026-11-10", "2026-11-11", "2026-11-12"],
    weather_code: [63, 51, 55],
    temperature_2m_max: [3, 3.2, 6],
    temperature_2m_min: [-0.9, 1, 2.1],
    precipitation_probability_max: [100, 14, null],
  },
};

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

test("zwraca tylko potrzebne pola i datę pobrania", async () => {
  const { fn, calls } = fakeFetch([json(GEO), json(FORECAST)]);
  const r = await getWeather("Warszawa", fn, NOW);
  assert.deepEqual(r, {
    miasto: "Warszawa",
    region: "Województwo mazowieckie",
    kraj: "Polska",
    teraz: { czasPomiaru: "2026-11-10T19:45", opis: "lekka mżawka", temperaturaC: 1.2, odczuwalnaC: -2.6, opadyMm: 0.1, wiatrKmh: 11.5 },
    prognoza: [
      { data: "2026-11-10", opis: "umiarkowany deszcz", tempMaxC: 3, tempMinC: -0.9, szansaOpaduProc: 100 },
      { data: "2026-11-11", opis: "lekka mżawka", tempMaxC: 3.2, tempMinC: 1, szansaOpaduProc: 14 },
      { data: "2026-11-12", opis: "gęsta mżawka", tempMaxC: 6, tempMinC: 2.1, szansaOpaduProc: null },
    ],
    zrodlo: "Open-Meteo (open-meteo.com)",
    pobrano: "2026-11-10T18:45:00.000Z",
  });
  assert.match(calls[0], /^https:\/\/geocoding-api\.open-meteo\.com\/v1\/search\?name=Warszawa/);
  assert.match(calls[1], /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=52\.23&longitude=21\.01/);
});

test("nazwa miasta jest kodowana w adresie", async () => {
  const { fn, calls } = fakeFetch([json({})]);
  await getWeather("Bielsko-Biała&x=1", fn, NOW);
  assert.ok(calls[0].includes("name=Bielsko-Bia%C5%82a%26x%3D1"), calls[0]);
});

test("nieznane miasto daje czytelny komunikat", async () => {
  const { fn } = fakeFetch([json({ generationtime_ms: 0.3 })]);
  const r = await getWeather("Xqzwqzz", fn, NOW);
  assert.deepEqual(r, { blad: "Nie znaleziono miejscowości „Xqzwqzz”. Sprawdź pisownię.", pobrano: "2026-11-10T18:45:00.000Z" });
});

test("API nie odpowiada (błąd sieci lub limit czasu) daje komunikat, nie wyjątek", async () => {
  const { fn } = fakeFetch([new TypeError("fetch failed")]);
  const r = await getWeather("Warszawa", fn, NOW);
  assert.equal(r.blad, "Serwis pogody nie odpowiada. Spróbuj ponownie za chwilę.");
  assert.equal(r.pobrano, "2026-11-10T18:45:00.000Z");
});

test("błąd HTTP z API daje komunikat", async () => {
  const { fn } = fakeFetch([json(GEO), json({ error: true, reason: "Bad request" }, 400)]);
  const r = await getWeather("Warszawa", fn, NOW);
  assert.equal(r.blad, "Serwis pogody nie odpowiada. Spróbuj ponownie za chwilę.");
});

test("nieoczekiwany kształt odpowiedzi daje komunikat", async () => {
  const { fn } = fakeFetch([json(GEO), json({ current: { temperature_2m: "zimno" } })]);
  const r = await getWeather("Warszawa", fn, NOW);
  assert.equal(r.blad, "Serwis pogody zwrócił nieoczekiwane dane. Spróbuj później.");
});

test("opis nieznanego kodu pogody i opis narzędzia", () => {
  assert.equal(describeWeatherCode(0), "bezchmurnie");
  assert.equal(describeWeatherCode(42), "kod pogody 42");
  assert.match(pogoda.description, /pogod/);
});
