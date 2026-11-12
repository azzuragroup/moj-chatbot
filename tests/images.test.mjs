// Testy zdjęć i generowania obrazów. Nie wywołują modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  describeModelError,
  parseImageRequest,
  reportedModel,
  validateChatFiles,
} from "../lib/images.ts";

const png = (bytes) => `data:image/png;base64,${Buffer.alloc(bytes).toString("base64")}`;
const msg = (role, ...files) => ({ role, parts: [{ type: "text", text: "Co jest na zdjęciu?" }, ...files] });
const file = (mediaType, url) => ({ type: "file", mediaType, url });

test("poprawne zdjęcie przechodzi", () => {
  assert.equal(validateChatFiles([msg("user", file("image/png", png(1000)))]), null);
  assert.equal(validateChatFiles([msg("user")]), null);
});

test("zdjęcie większe niż 4 MB jest odrzucane", () => {
  assert.equal(validateChatFiles([msg("user", file("image/png", png(4 * 1024 * 1024)))]), null);
  assert.match(validateChatFiles([msg("user", file("image/png", png(4 * 1024 * 1024 + 1)))]), /4 MB/);
});

test("niedozwolony format jest odrzucany", () => {
  const gif = "data:image/gif;base64,R0lGOD";
  assert.match(validateChatFiles([msg("user", file("image/gif", gif))]), /JPG, PNG i WEBP/);
  assert.match(validateChatFiles([msg("user", file("application/pdf", "data:application/pdf;base64,AA"))]), /JPG/);
});

test("link do cudzego serwera zamiast danych jest odrzucany", () => {
  assert.match(validateChatFiles([msg("user", file("image/png", "https://example.com/a.png"))]), /urządzenia/);
  assert.match(validateChatFiles([msg("user", file("image/png", "data:image/jpeg;base64,AA"))]), /urządzenia/);
});

test("zdjęcia w wiadomościach asystenta i za dużo zdjęć są odrzucane", () => {
  assert.match(validateChatFiles([msg("assistant", file("image/png", png(10)))]), /użytkownika/);
  const five = Array.from({ length: 5 }, () => file("image/png", png(10)));
  assert.match(validateChatFiles([msg("user", ...five)]), /najwyżej 4/);
});

test("opis obrazu: pusty, za długi i dodatkowe pola", () => {
  assert.deepEqual(parseImageRequest({ prompt: "  kot w kapeluszu " }), { ok: true, prompt: "kot w kapeluszu" });
  assert.equal(parseImageRequest({ prompt: "a".repeat(500) }).ok, true);
  assert.match(parseImageRequest({ prompt: "a".repeat(501) }).error, /500 znaków/);
  assert.match(parseImageRequest({ prompt: "  " }).error, /Wpisz opis/);
  assert.match(parseImageRequest({ prompt: "kot", model: "inny" }).error, /Niedozwolone/);
  assert.equal(parseImageRequest(null).ok, false);
});

test("niedostępny model daje zrozumiały komunikat po polsku", () => {
  assert.match(describeModelError(404, "No endpoints found", "image"), /Model obrazów jest teraz niedostępny/);
  assert.match(describeModelError(503, "upstream error", "image"), /niedostępny/);
  assert.match(describeModelError(404, "No endpoints found that support image input", "chat"), /nie obsługuje zdjęć/);
  assert.match(describeModelError(402, "", "image"), /Brak środków/);
  assert.match(describeModelError(undefined, undefined, "chat"), /Model jest teraz niedostępny/);
});

test("model odczytywany z odpowiedzi API, bez zgadywania", () => {
  assert.equal(reportedModel({ model: "google/gemini-3.1-flash-image-preview", data: [] }), "google/gemini-3.1-flash-image-preview");
  assert.equal(reportedModel({ data: [] }), undefined);
  assert.equal(reportedModel({ model: "" }), undefined);
  assert.equal(reportedModel(null), undefined);
});

test("do serwera idą tylko zdjęcia z ostatniej wiadomości użytkownika", async () => {
  const { stripOldImages } = await import("../components/chatImages.ts");
  const img = file("image/jpeg", "data:image/jpeg;base64,AAAA");
  const messages = [
    { id: "1", role: "user", parts: [{ type: "text", text: "pierwsze" }, img] },
    { id: "2", role: "assistant", parts: [{ type: "text", text: "Widzę kota." }] },
    { id: "3", role: "assistant", parts: [{ type: "file", mediaType: "image/png", url: "data:image/png;base64,BBBB" }] },
    { id: "4", role: "user", parts: [{ type: "text", text: "a to?" }, img] },
  ];
  const out = stripOldImages(messages);
  assert.deepEqual(out[0].parts, [{ type: "text", text: "pierwsze" }, { type: "text", text: "[wcześniej wysłane zdjęcie]" }]);
  assert.deepEqual(out[1], messages[1]);
  assert.deepEqual(out[2].parts, [{ type: "text", text: "[wygenerowany obraz]" }]);
  assert.deepEqual(out[3], messages[3]);
  assert.equal(validateChatFiles(out), null, "wynik przechodzi walidację serwera");
});

test("identyfikator wywołania z nagłówka albo z treści i model ze statystyk", async () => {
  const { generationIdFrom, modelFromGenerationStats } = await import("../lib/images.ts");
  const headers = (h) => new Headers(h);
  assert.equal(generationIdFrom(headers({ "x-generation-id": "gen-abc" }), {}), "gen-abc");
  assert.equal(generationIdFrom(headers({}), { id: "gen-xyz" }), "gen-xyz");
  assert.equal(generationIdFrom(headers({}), { id: "img_1" }), undefined);
  assert.equal(generationIdFrom(headers({}), null), undefined);
  assert.equal(
    modelFromGenerationStats({ data: { id: "gen-abc", model: "google/gemini-3.1-flash-image-preview", provider_name: "Google" } }),
    "google/gemini-3.1-flash-image-preview",
  );
  assert.equal(modelFromGenerationStats({ data: {} }), undefined);
  assert.equal(modelFromGenerationStats({ error: "not found" }), undefined);
});

test("błąd 400 nie udaje niedostępnego modelu", () => {
  assert.match(describeModelError(400, "Bad request", "image"), /odrzucił to zlecenie obrazu/);
  assert.match(describeModelError(400, "Bad request", "chat"), /odrzucił to zapytanie/);
});
