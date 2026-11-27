// Pierwsze wejście: powitanie z dwoma pytaniami tylko przy pustym profilu. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WELCOME_MESSAGE_ID,
  WELCOME_QUESTIONS,
  hasWelcome,
  isProfileEmpty,
  onboardingInstruction,
  welcomeText,
} from "../lib/profileCore.ts";

test("pusty profil: brak wiersza, brak imienia i preferencji", () => {
  assert.equal(isProfileEmpty(null), true);
  assert.equal(isProfileEmpty({ name: null, preferences: {} }), true);
  assert.equal(isProfileEmpty({ name: "  ", preferences: { kanały: " " } }), true);
  assert.equal(isProfileEmpty({ name: "Ola", preferences: {} }), false);
  assert.equal(isProfileEmpty({ name: null, preferences: { kanały: "LinkedIn" } }), false);
});

test("powitanie: imię, jedno zdanie o pomocy z markami i dwa pytania", () => {
  const t = welcomeText("ania");
  assert.match(t, /^Cześć, ania! 🔵/);
  for (const marka of ["BoardeX", "Azzura ThermoFloor", "Dragonwood", "ADO"]) assert.ok(t.includes(marka), marka);
  assert.ok(t.includes(`1. ${WELCOME_QUESTIONS[0]}`));
  assert.ok(t.includes(`2. ${WELCOME_QUESTIONS[1]}`));
  assert.match(welcomeText(null), /^Cześć! 🔵/);
});

test("powitanie rozpoznane w czacie i po wczytaniu z bazy", () => {
  const welcome = { id: WELCOME_MESSAGE_ID, role: "assistant", parts: [{ type: "text", text: welcomeText("Ola") }] };
  const fromDb = { id: "db-12", role: "assistant", parts: [{ type: "text", text: welcomeText(null) }] };
  const user = { id: "u1", role: "user", parts: [{ type: "text", text: WELCOME_QUESTIONS[0] }] };
  assert.equal(hasWelcome([welcome, user]), true);
  assert.equal(hasWelcome([fromDb]), true);
  assert.equal(hasWelcome([user]), false, "pytanie wpisane przez użytkownika to nie powitanie");
  assert.equal(hasWelcome([]), false);
});

test("instrukcja: zapis przez zapiszProfil, bez ponownego pytania", () => {
  const i = onboardingInstruction();
  assert.match(i, /zapiszProfil/);
  assert.match(i, /imie, rola, kanaly, ton/);
  assert.match(i, /Nie powtarzaj tych pytań/);
});

import { WELCOME_ROLE_QUESTION, needsOnboarding } from "../lib/profileCore.ts";

test("nowa osoba = brak preferencji; samo imię z Google nie wyłącza pytań", () => {
  assert.equal(needsOnboarding(null), true);
  assert.equal(needsOnboarding({ name: "azzuragroup", preferences: {} }), true);
  assert.equal(needsOnboarding({ name: null, preferences: { rola: "marketing" } }), false);
  assert.equal(needsOnboarding({ name: "Kasia", preferences: { kanały: "LinkedIn", ton_komunikacji: "rzeczowy" } }), false);
});

test("znane imię: powitanie po imieniu i pytanie tylko o rolę", () => {
  const t = welcomeText("Dagmara", true);
  assert.match(t, /^Cześć, Dagmara! 🔵/);
  assert.ok(t.includes(`1. ${WELCOME_ROLE_QUESTION}`));
  assert.ok(!t.includes("Jak masz na imię"));
  assert.ok(t.includes(`2. ${WELCOME_QUESTIONS[1]}`));
  assert.equal(hasWelcome([{ role: "assistant", parts: [{ type: "text", text: t }] }]), true);
});
