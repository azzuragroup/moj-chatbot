// Testy narzędzia aktualnyCzas. Nie wywołują modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { aktualnyCzas, currentWarsawTime } from "../lib/tools.ts";

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

test("narzędzie ma opis i zwraca bieżący czas", async () => {
  assert.match(aktualnyCzas.description, /dziś/);
  assert.match(aktualnyCzas.description, /jutro/);
  assert.match(aktualnyCzas.description, /za ile dni/);
  const r = await aktualnyCzas.execute({}, { toolCallId: "test", messages: [] });
  assert.match(r.data, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(r.godzina, /^\d{2}:\d{2}$/);
});
