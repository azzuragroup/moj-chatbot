// Testy połączonego agenta bez wywoływania modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { convertToModelMessages, tool } from "ai";
import { imageToolSpec } from "../lib/images.ts";
import { stripOldImages } from "../components/chatImages.ts";

const BIG = "data:image/png;base64," + "A".repeat(200000);
const generated = {
  id: "a1",
  role: "assistant",
  parts: [
    {
      type: "tool-generujObraz",
      toolCallId: "call-1",
      state: "output-available",
      input: { opis: "logo kawiarni" },
      output: { ok: true, url: BIG, mediaType: "image/png", modelId: "google/x", brand: "Azzura Group" },
    },
    { type: "text", text: "Gotowe." },
  ],
};
const history = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "Wygeneruj obraz: logo kawiarni" }] },
  generated,
  { id: "u2", role: "user", parts: [{ type: "text", text: "Dzięki" }] },
];

test("model dostaje tylko tekst „obraz wygenerowany”, nie plik", async () => {
  const tools = { generujObraz: tool({ ...imageToolSpec, execute: async () => ({ ok: false, message: "test" }) }) };
  const modelMessages = await convertToModelMessages(history, { tools });
  const json = JSON.stringify(modelMessages);
  assert.ok(json.includes("obraz wygenerowany"), json.slice(0, 400));
  assert.ok(!json.includes("AAAAAAAAAA"), "w wiadomościach dla modelu nie ma danych obrazu");
  assert.ok(json.length < 5000, `rozmiar: ${json.length}`);
});

test("toModelOutput przy błędzie przekazuje tylko komunikat", () => {
  assert.deepEqual(imageToolSpec.toModelOutput({ output: { ok: false, message: "Model obrazów jest teraz niedostępny." } }), {
    type: "text",
    value: "nie udało się wygenerować obrazu: Model obrazów jest teraz niedostępny.",
  });
});

test("przeglądarka nie odsyła na serwer danych wygenerowanego obrazu", () => {
  const out = stripOldImages(history);
  assert.equal(out[1].parts[0].output.url, "");
  assert.equal(out[1].parts[0].output.modelId, "google/x");
  assert.equal(history[1].parts[0].output.url, BIG, "oryginał w rozmowie zostaje bez zmian");
});

test("opis narzędzia: do 500 znaków", () => {
  assert.equal(imageToolSpec.inputSchema.safeParse({ opis: "a".repeat(500) }).success, true);
  assert.equal(imageToolSpec.inputSchema.safeParse({ opis: "a".repeat(501) }).success, false);
});
