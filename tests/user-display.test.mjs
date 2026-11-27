// Imię i avatar w nagłówku z danych konta Google (user_metadata). Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { displayFromMetadata } from "../lib/userDisplay.ts";

// Kształt jak w prawdziwych danych konta Google w Supabase (wartości zmyślone).
const google = {
  avatar_url: "https://lh3.googleusercontent.com/a/ABC123=s96-c",
  email: "ola@firma.pl",
  email_verified: true,
  full_name: "Ola Nowak",
  iss: "https://accounts.google.com",
  name: "Ola Nowak",
  phone_verified: false,
  picture: "https://lh3.googleusercontent.com/a/ABC123=s96-c",
  provider_id: "123",
  sub: "123",
};

test("konto Google: imię z full_name, avatar z avatar_url", () => {
  assert.deepEqual(displayFromMetadata(google), { name: "Ola Nowak", avatarUrl: "https://lh3.googleusercontent.com/a/ABC123=s96-c" });
});

test("zapas: name i picture, gdy brak full_name i avatar_url", () => {
  assert.deepEqual(displayFromMetadata({ name: " Jan ", picture: "https://lh3.googleusercontent.com/x" }), {
    name: "Jan",
    avatarUrl: "https://lh3.googleusercontent.com/x",
  });
});

test("konto e-mailowe: brak imienia i avatara", () => {
  assert.deepEqual(displayFromMetadata({ email: "a@b.pl", email_verified: true, phone_verified: false, sub: "x" }), { name: null, avatarUrl: null });
  assert.deepEqual(displayFromMetadata(null), { name: null, avatarUrl: null });
  assert.deepEqual(displayFromMetadata("tekst"), { name: null, avatarUrl: null });
});

test("avatar tylko z https://", () => {
  for (const bad of ["javascript:alert(1)", "data:image/png;base64,AAA", "http://lh3.googleusercontent.com/x", "//zly.pl/x.png", "nie-adres", 123]) {
    assert.equal(displayFromMetadata({ avatar_url: bad }).avatarUrl, null, String(bad));
  }
});

test("bardzo długie imię jest skracane", () => {
  assert.equal(displayFromMetadata({ full_name: "a".repeat(200) }).name.length, 60);
});

import { avatarInitial } from "../lib/userDisplay.ts";

test("kółko z literą: z imienia, a bez imienia z e-maila", () => {
  assert.equal(avatarInitial("ola Nowak", "x@y.pl"), "O");
  assert.equal(avatarInitial("łukasz", null), "Ł");
  assert.equal(avatarInitial(null, "ania+test@firma.pl"), "A");
  assert.equal(avatarInitial("  „Ewa”", null), "E");
  assert.equal(avatarInitial(null, null), "?");
});
