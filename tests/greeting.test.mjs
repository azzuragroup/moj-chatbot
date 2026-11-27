// Powitanie „Cześć, <imię>!”: imię z profilu albo część e-maila przed @. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { greetingName } from "../lib/profileCore.ts";

test("imię z profilu ma pierwszeństwo", () => {
  assert.equal(greetingName("Dagmara", "azzuragroupcom@gmail.com"), "Dagmara");
  assert.equal(greetingName("  Ola   Nowak ", "ola@firma.pl"), "Ola Nowak");
});

test("bez imienia – część e-maila przed @", () => {
  assert.equal(greetingName(null, "azzuragroupcom@gmail.com"), "azzuragroupcom");
  assert.equal(greetingName("   ", "jan.kowalski@firma.pl"), "jan.kowalski");
  assert.equal(greetingName(undefined, "ola@firma.pl"), "ola");
});

test("brak imienia i e-maila – null", () => {
  assert.equal(greetingName(null, null), null);
  assert.equal(greetingName("", ""), null);
  assert.equal(greetingName(null, "@firma.pl"), null);
});
