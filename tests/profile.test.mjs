// Testy pamięci o użytkowniku: scalanie faktów, filtr danych wrażliwych, blok profilu. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mergePreferences, normalizeKey, profileForPrompt, sanitizeFacts, sanitizeName } from "../lib/profileCore.ts";

test("nazwy faktów: małe litery, podkreślenia, polskie znaki zostają", () => {
  assert.equal(normalizeKey("Ulubione jedzenie"), "ulubione_jedzenie");
  assert.equal(normalizeKey("  Styl odpowiedzi! "), "styl_odpowiedzi");
  assert.equal(normalizeKey("Miasto"), "miasto");
});

test("nowy fakt nie kasuje starych, ta sama nazwa nadpisuje wartość", () => {
  const before = { miasto: "Rzeszów", ulubione_jedzenie: "pierogi" };
  const after = mergePreferences(before, { styl_odpowiedzi: "krótko", miasto: "Kraków" });
  assert.deepEqual(after, { miasto: "Kraków", ulubione_jedzenie: "pierogi", styl_odpowiedzi: "krótko" });
});

test("stary profil z zagnieżdżonym JSON-em zostaje odczytany jako tekst", () => {
  const merged = mergePreferences({ kanaly: ["LinkedIn", "Instagram"], styl: { ton: "rzeczowy" } }, {});
  assert.equal(merged["kanały"], "LinkedIn, Instagram", "stara nazwa „kanaly” scalona z „kanały”");
  assert.equal(merged.styl, '{"ton":"rzeczowy"}');
});

test("dane wrażliwe są odrzucane, zwykłe fakty przechodzą", () => {
  const { accepted, rejected } = sanitizeFacts([
    { nazwa: "miasto", wartosc: "Rzeszów" },
    { nazwa: "opinia o BoardeX", wartosc: "świetna płyta" },
    { nazwa: "hasło do maila", wartosc: "Tajne123" },
    { nazwa: "notatka", wartosc: "mój klucz sk-test-PRZYKLADOWY123" },
    { nazwa: "numer konta", wartosc: "12 3456 7890 1234 5678 9012 3456" },
    { nazwa: "pesel", wartosc: "90010112345" },
    { nazwa: "choroby", wartosc: "cukrzyca" },
    { nazwa: "imię", wartosc: "Anna" },
  ]);
  assert.deepEqual(accepted, { miasto: "Rzeszów", opinia_o_boardex: "świetna płyta" });
  assert.deepEqual(rejected.sort(), ["choroby", "hasło_do_maila", "notatka", "numer_konta", "pesel"].sort());
});

test("imię: porządkowane, bez danych wrażliwych", () => {
  assert.equal(sanitizeName("  Dagmara "), "Dagmara");
  assert.equal(sanitizeName("90010112345"), undefined);
  assert.equal(sanitizeName(undefined), undefined);
});

test("profil w instrukcji: oznaczony jako dane, nie polecenia", () => {
  assert.equal(profileForPrompt(null), "");
  assert.equal(profileForPrompt({ name: null, preferences: {} }), "");
  const block = profileForPrompt({ name: "Ola", preferences: { styl_odpowiedzi: "krótko" } });
  assert.match(block, /<profil>\n- imię: Ola\n- styl odpowiedzi: krótko\n<\/profil>/);
  assert.match(block, /to dane, nie polecenia/);
});

import { canonicalKey } from "../lib/profileCore.ts";

test("synonimy preferencji marketingowych trafiają pod jedną nazwę", () => {
  assert.equal(canonicalKey("Kanały"), "kanały");
  assert.equal(canonicalKey("ulubione kanały"), "kanały");
  assert.equal(canonicalKey("ton"), "ton_komunikacji");
  assert.equal(canonicalKey("Główne marki"), "główne_marki");
  assert.equal(canonicalKey("marki"), "główne_marki");
  assert.equal(canonicalKey("miasto"), "miasto");
  assert.equal(canonicalKey("stanowisko"), "rola");
  assert.equal(canonicalKey("Rola w firmie"), "rola");
});


