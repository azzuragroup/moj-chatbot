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

import { loginErrorPath } from "../lib/authRedirect.ts";
import { loginErrorMessage } from "../lib/authMessages.ts";

test("powrót na /login z błędem: zachowany cel, obcy cel odrzucony", () => {
  assert.equal(loginErrorPath("/", "google"), "/login?blad=google");
  assert.equal(loginErrorPath("/upload", "google-anulowane"), "/login?next=%2Fupload&blad=google-anulowane");
  assert.equal(loginErrorPath("https://zly.pl", "link"), "/login?blad=link");
});

test("komunikaty po polsku dla błędów logowania", () => {
  assert.match(loginErrorMessage("google"), /Nie udało się zalogować przez Google/);
  assert.match(loginErrorMessage("google-anulowane"), /anulowane/);
  assert.match(loginErrorMessage("link"), /Link potwierdzający/);
  assert.equal(loginErrorMessage("<script>"), "");
  assert.equal(loginErrorMessage(["google"]), "");
});

import { requestOrigin } from "../lib/authRedirect.ts";

const hdr = (h) => (name) => h[name] ?? null;

test("adres aplikacji z nagłówków: lokalnie Host, na Vercelu X-Forwarded-*", () => {
  assert.equal(requestOrigin(hdr({ host: "localhost:3000" }), "http://localhost:3000"), "http://localhost:3000");
  assert.equal(requestOrigin(hdr({ host: "127.0.0.1:3000" }), "http://localhost:3000"), "http://127.0.0.1:3000");
  assert.equal(
    requestOrigin(hdr({ host: "localhost:3000", "x-forwarded-host": "moj-chatbot-warsztat.vercel.app", "x-forwarded-proto": "https" }), "http://localhost:3000"),
    "https://moj-chatbot-warsztat.vercel.app",
  );
  assert.equal(requestOrigin(hdr({ "x-forwarded-host": "a.vercel.app, b.internal", "x-forwarded-proto": "https,http" }), "http://x"), "https://a.vercel.app");
});

test("podejrzane nagłówki – adres zapasowy", () => {
  const fb = "http://localhost:3000";
  assert.equal(requestOrigin(hdr({ host: "zly.pl/sciezka" }), fb), fb);
  assert.equal(requestOrigin(hdr({ host: "zly.pl@dobry.pl" }), fb), fb);
  assert.equal(requestOrigin(hdr({ host: "zly .pl" }), fb), fb);
  assert.equal(requestOrigin(hdr({ host: "dobry.pl", "x-forwarded-proto": "javascript" }), fb), fb);
  assert.equal(requestOrigin(hdr({}), fb), fb);
});

import { oauthErrorReason, withoutOAuthError } from "../lib/authRedirect.ts";

const q = (s) => new URLSearchParams(s);

test("błąd logowania od Supabase/Google rozpoznany po parametrach", () => {
  assert.equal(oauthErrorReason(q("error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired")), "google-wygaslo");
  assert.equal(oauthErrorReason(q("error=access_denied&error_code=access_denied&error_description=x")), "google-anulowane");
  assert.equal(oauthErrorReason(q("error=access_denied&error_description=The+user+denied+access")), "google-anulowane");
  assert.equal(oauthErrorReason(q("error=server_error&error_description=x")), "google");
  assert.equal(oauthErrorReason(q("error=x")), null, "sam ?error= bez kodu i opisu to nie błąd logowania");
  assert.equal(oauthErrorReason(q("c=12")), null);
});

test("adres bez parametrów błędu; ?next= nie przenosi błędu", () => {
  assert.equal(withoutOAuthError("/", "?error=invalid_request&error_code=bad_oauth_state&error_description=x"), "/");
  assert.equal(withoutOAuthError("/", "?c=12&error=x&error_code=y"), "/?c=12");
  assert.equal(safeNextPath("/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired"), "/");
  assert.equal(safeNextPath("/?c=12&error=x&error_code=y"), "/?c=12");
  assert.equal(safeNextPath("/history#gora"), "/history#gora");
  assert.equal(loginErrorMessage("google-wygaslo").includes("wygasło"), true);
});
