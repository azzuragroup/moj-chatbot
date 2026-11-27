// Logowanie i rejestracja: sprawdzanie pól i polskie komunikaty błędów. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTH_MESSAGES, MIN_PASSWORD, authErrorMessage, signUpOutcome, validateCredentials } from "../lib/authMessages.ts";

test("pola: pusty e-mail, zły e-mail, puste hasło", () => {
  assert.equal(validateCredentials("", "haslo1234", "login"), AUTH_MESSAGES.emptyEmail);
  assert.equal(validateCredentials("  ", "haslo1234", "login"), AUTH_MESSAGES.emptyEmail);
  assert.equal(validateCredentials("jan.firma.pl", "haslo1234", "login"), AUTH_MESSAGES.badEmail);
  assert.equal(validateCredentials("jan@firma.pl", "", "login"), AUTH_MESSAGES.emptyPassword);
});

test("za krótkie hasło – tylko przy zakładaniu konta, granica 8 znaków", () => {
  assert.equal(MIN_PASSWORD, 8);
  assert.equal(validateCredentials("jan@firma.pl", "1234567", "signup"), AUTH_MESSAGES.shortPassword);
  assert.equal(validateCredentials("jan@firma.pl", "12345678", "signup"), null);
  assert.equal(validateCredentials("jan@firma.pl", "1234567", "login"), null);
  assert.match(AUTH_MESSAGES.shortPassword, /8 znaków/);
});

test("kody błędów Supabase → polskie komunikaty", () => {
  assert.equal(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }), AUTH_MESSAGES.wrongPassword);
  assert.equal(authErrorMessage({ code: "user_already_exists" }), AUTH_MESSAGES.accountExists);
  assert.equal(authErrorMessage({ code: "email_exists" }), AUTH_MESSAGES.accountExists);
  assert.equal(authErrorMessage({ code: "weak_password" }), AUTH_MESSAGES.weakPassword);
  assert.equal(authErrorMessage({ code: "email_not_confirmed" }), AUTH_MESSAGES.notConfirmed);
  assert.equal(authErrorMessage({ code: "over_request_rate_limit" }), AUTH_MESSAGES.tooMany);
  assert.equal(authErrorMessage({ code: "signup_disabled" }), AUTH_MESSAGES.signupDisabled);
});

test("błędy bez kodu – po treści; nieznany błąd nie pokazuje angielskiego tekstu", () => {
  assert.equal(authErrorMessage({ message: "Invalid login credentials" }), AUTH_MESSAGES.wrongPassword);
  assert.equal(authErrorMessage({ message: "User already registered" }), AUTH_MESSAGES.accountExists);
  assert.equal(authErrorMessage({ message: "Password should be at least 6 characters." }), AUTH_MESSAGES.weakPassword);
  assert.equal(authErrorMessage({ message: "Failed to fetch" }), AUTH_MESSAGES.network);
  assert.equal(authErrorMessage({ message: "Something weird" }), AUTH_MESSAGES.unknown);
  assert.equal(authErrorMessage(null), AUTH_MESSAGES.unknown);
});

test("wynik rejestracji: od razu zalogowany, potwierdź e-mail, konto istnieje", () => {
  assert.equal(signUpOutcome({ session: { access_token: "x" }, user: { identities: [{}] } }), "signed-in");
  assert.equal(signUpOutcome({ session: null, user: { identities: [{}] } }), "confirm");
  assert.equal(signUpOutcome({ session: null, user: { identities: [] } }), "exists");
  assert.equal(signUpOutcome({ session: null, user: null }), "error");
});
