// Testy planera social media: dni postów, przesunięcia ze świąt, okazje, rotacja produktów. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { containsPrice, monthDays, nextProduct, planMonth, productRotation } from "../lib/plannerCore.ts";

const NOV = [
  { data: "2026-11-01", nazwa: "Wszystkich Świętych" },
  { data: "2026-11-11", nazwa: "Narodowe Święto Niepodległości" },
];
const posts = (plan) => plan.tygodnie.flatMap((w) => w.posty);

test("listopad 2026: pon./śr./pt., tygodnie od poniedziałku", () => {
  const plan = planMonth("2026-11", NOV);
  assert.equal(monthDays("2026-11").length, 30);
  assert.equal(plan.tygodnie.length, 5, "1 listopada (niedziela) nie tworzy tygodnia bez postów");
  assert.deepEqual(plan.tygodnie.map((w) => [w.od, w.do]), [
    ["2026-11-02", "2026-11-08"], ["2026-11-09", "2026-11-15"], ["2026-11-16", "2026-11-22"],
    ["2026-11-23", "2026-11-29"], ["2026-11-30", "2026-11-30"],
  ]);
  assert.equal(posts(plan).length, 13);
  assert.ok(posts(plan).every((p) => ["poniedziałek", "środa", "piątek", "czwartek"].includes(p.dzienTygodnia)));
});

test("święto w środę → post w najbliższy dzień roboczy tego tygodnia, oznaczony", () => {
  const week2 = planMonth("2026-11", NOV).tygodnie[1];
  assert.deepEqual(week2.posty.map((p) => p.data), ["2026-11-09", "2026-11-12", "2026-11-13"]);
  const moved = week2.posty[1];
  assert.equal(moved.dzienTygodnia, "czwartek");
  assert.deepEqual(moved.przesunieto, { z: "2026-11-11", dzien: "środa", powod: "Narodowe Święto Niepodległości" });
  assert.deepEqual(moved.okazje, ["Narodowe Święto Niepodległości"]);
  assert.deepEqual(week2.posty[0].okazje, [], "poniedziałek: brak okazji");
});

test("święto w piątek, czwartek zajęty świętem → wtorek tego samego tygodnia", () => {
  const dec = [
    { data: "2026-12-24", nazwa: "Wigilia" },
    { data: "2026-12-25", nazwa: "Boże Narodzenie" },
    { data: "2026-12-26", nazwa: "Drugi dzień Bożego Narodzenia" },
  ];
  const week = planMonth("2026-12", dec).tygodnie.find((w) => w.od === "2026-12-21");
  assert.deepEqual(week.posty.map((p) => p.data), ["2026-12-21", "2026-12-22", "2026-12-23"]);
  assert.equal(week.posty[1].przesunieto.z, "2026-12-25");
  assert.ok(week.posty[2].okazje.includes("Wigilia"), "święto po środzie trafia do posta ze środy");
});

test("cały tydzień roboczy wolny → post pominięty z powodem", () => {
  const all = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].map((d) => ({ data: d, nazwa: "Test" }));
  const plan = planMonth("2026-11", all);
  assert.equal(plan.tygodnie[2].posty.length, 0);
  assert.equal(plan.pominiete.length, 3);
  assert.match(plan.pominiete[0].powod, /brak wolnego dnia roboczego/);
});

test("bez danych o świętach: nic nie przesuwamy, okazje = null (Brak danych)", () => {
  const plan = planMonth("2026-11", null);
  assert.ok(posts(plan).some((p) => p.data === "2026-11-11"));
  assert.ok(posts(plan).every((p) => p.okazje === null && !p.przesunieto));
});

test("rotacja produktów: bez powtórek w miesiącu, inny start w innym miesiącu", () => {
  const slugs = Array.from({ length: 36 }, (_, i) => `p${i}`);
  const nov = productRotation(slugs, "2026-11");
  assert.equal(new Set(nov).size, 36, "przechodzi przez wszystkie produkty");
  assert.equal(new Set(nov.slice(0, 13)).size, 13);
  assert.notEqual(productRotation(slugs, "2026-12")[0], nov[0]);
  const dec = productRotation(slugs, "2026-12").slice(0, 13);
  assert.equal(dec.filter((x) => nov.slice(0, 13).includes(x)).length, 0, "grudzień nie powtarza produktów z listopada");
  assert.deepEqual(productRotation(slugs, "2026-11"), nov, "ten sam miesiąc → ta sama kolejność");
});

test("inny produkt: spoza planu miesiąca", () => {
  const slugs = ["a", "b", "c", "d"];
  const used = ["a", "b", "c"];
  assert.equal(nextProduct(slugs, "2026-11", "a", used), "d");
  assert.equal(nextProduct(["a", "b"], "2026-11", "a", ["a", "b"]), null);
});

test("wykrywanie cen w szkicu", () => {
  assert.equal(containsPrice("Płyta za 120 zł/m²"), true);
  assert.equal(containsPrice("Cena: do ustalenia"), true);
  assert.equal(containsPrice("Grubość 12 mm, format 1250×2500 mm"), false);
  assert.equal(containsPrice("Wyślij zapytanie o wycenę"), false);
});
