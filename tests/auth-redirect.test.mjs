// Powrót po zalogowaniu: tylko adresy wewnątrz aplikacji. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loginPath, safeNextPath } from "../lib/authRedirect.ts";

test("adresy wewnątrz aplikacji przechodzą (z parametrami)", () => {
  assert.equal(safeNextPath("/upload"), "/upload");
  assert.equal(safeNextPath("/?c=12"), "/?c=12");
  assert.equal(safeNextPath("/history#gora"), "/history#gora");
  assert.equal(safeNextPath("/porownanie?a=1&b=2"), "/porownanie?a=1&b=2");
});

test("adresy na zewnątrz – zawsze strona główna", () => {
  for (const bad of [
    "https://zly.pl",
    "http://zly.pl/upload",
    "//zly.pl",
    "///zly.pl",
    "/\\zly.pl",
    "\\\\zly.pl",
    "/\t/zly.pl",
    "/\n/zly.pl",
    "/.//zly.pl",
    "javascript:alert(1)",
    "upload",
    "",
    "   ",
  ]) {
    assert.equal(safeNextPath(bad), "/", `powinno odrzucić: ${JSON.stringify(bad)}`);
  }
});

test("zły typ (np. tablica z adresu ?next=a&next=b) i za długi adres", () => {
  assert.equal(safeNextPath(["/upload", "/history"]), "/");
  assert.equal(safeNextPath(undefined), "/");
  assert.equal(safeNextPath("/" + "a".repeat(600)), "/");
});

test("bez pętli: logowanie, potwierdzenie e-maila i API nie są celem", () => {
  assert.equal(safeNextPath("/login"), "/");
  assert.equal(safeNextPath("/login?next=/upload"), "/");
  assert.equal(safeNextPath("/auth/confirm?code=x"), "/");
  assert.equal(safeNextPath("/api/agent"), "/");
  assert.equal(safeNextPath("/loginy"), "/loginy");
});

test("zakodowane ukośniki zostają ścieżką w aplikacji", () => {
  assert.equal(safeNextPath("/%2F%2Fzly.pl"), "/%2F%2Fzly.pl");
});

test("adres strony logowania z celem", () => {
  assert.equal(loginPath("/upload"), "/login?next=%2Fupload");
  assert.equal(loginPath("/?c=12"), "/login?next=%2F%3Fc%3D12");
  assert.equal(loginPath("/"), "/login");
  assert.equal(loginPath("https://zly.pl"), "/login");
});
