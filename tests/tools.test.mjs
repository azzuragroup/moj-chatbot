// Testy narzędzia czas. Nie wywołują modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { czas, currentWarsawTime, timeIn } from "../lib/tools.ts";

test("czas zimowy: UTC+1", () => {
  assert.deepEqual(currentWarsawTime(new Date("2026-11-10T21:30:00Z")), {
    data: "2026-11-10",
    dzienTygodnia: "wtorek",
    godzina: "22:30",
    strefaCzasowa: "Europe/Warsaw",
  });
});

test("czas letni: UTC+2 i zmiana daty po północy w Polsce", () => {
  const r = currentWarsawTime(new Date("2026-07-31T22:15:00Z"));
  assert.equal(r.data, "2026-08-01");
  assert.equal(r.dzienTygodnia, "sobota");
  assert.equal(r.godzina, "00:15");
});

test("inna strefa: Nowy Jork i Tokio, z przesunięciem i godziną pobrania", () => {
  const now = new Date("2026-11-10T21:30:00Z");
  const ny = timeIn("America/New_York", now);
  assert.equal(ny.data, "2026-11-10");
  assert.equal(ny.godzina, "16:30");
  assert.equal(ny.przesuniecieUTC, "UTC-05:00");
  assert.equal(ny.pobrano, "2026-11-10T21:30:00.000Z");
  const tokyo = timeIn("Asia/Tokyo", now);
  assert.equal(tokyo.data, "2026-11-11");
  assert.equal(tokyo.przesuniecieUTC, "UTC+09:00");
});

test("nieznana strefa: czytelny komunikat zamiast błędu", () => {
  const r = timeIn("Europe/Atlantyda", new Date("2026-11-10T21:30:00Z"));
  assert.match(r.blad, /Nie znam strefy/);
  assert.ok(r.pobrano);
});

test("schemat odrzuca tekst, który nie jest strefą", () => {
  assert.equal(czas.inputSchema.safeParse({ strefa: "rm -rf /" }).success, false);
  assert.equal(czas.inputSchema.safeParse({}).success, true);
});

test("narzędzie ma opis i domyślnie zwraca czas w Polsce", async () => {
  assert.match(czas.description, /dziś/);
  assert.match(czas.description, /za ile dni/);
  const r = await czas.execute({}, { toolCallId: "test", messages: [] });
  assert.equal(r.strefaCzasowa, "Europe/Warsaw");
  assert.match(r.data, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(r.godzina, /^\d{2}:\d{2}$/);
});
