// Testy szkicu posta na Instagram. Nie wywołują modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { IG_HEIGHT, IG_WIDTH, buildCaption, normalizeHashtags } from "../lib/instagramPost.ts";
import { stripOldImages } from "../components/chatImages.ts";

const LINK = "https://azzuragroup.com/produkty/plyta-boardex/";
const tagi = ["AzzuraGroup", "#BoardeX", "elewacje", "#budownictwo", "płyta A1"];

test("hashtagi: znak #, bez spacji i bez powtórzeń", () => {
  assert.deepEqual(normalizeHashtags(["AzzuraGroup", "#AzzuraGroup", "płyta A1", " #elewacje ", "#"]), [
    "#AzzuraGroup",
    "#płytaA1",
    "#elewacje",
  ]);
});

test("opis zawiera treść, link z katalogu i hashtagi", () => {
  const r = buildCaption("Płyta BoardeX to poszycie elewacji w klasie A1.", tagi, LINK);
  assert.equal(r.ok, true);
  assert.ok(r.caption.startsWith("Płyta BoardeX"));
  assert.ok(r.caption.includes(`Więcej o produkcie: ${LINK}`));
  assert.ok(r.caption.endsWith("#AzzuraGroup #BoardeX #elewacje #budownictwo #płytaA1"));
  assert.equal(r.hashtagi.length, 5);
});

test("za mało i za dużo hashtagów jest odrzucane", () => {
  assert.match(buildCaption("Treść posta o produkcie.", ["#a", "#b", "#c", "#d"], LINK).message, /od 5 do 10/);
  const jedenascie = Array.from({ length: 11 }, (_, i) => `#tag${i}`);
  assert.match(buildCaption("Treść posta o produkcie.", jedenascie, LINK).message, /jest 11/);
});

test("limit 2200 znaków liczony razem z linkiem i hashtagami", () => {
  const r = buildCaption("a".repeat(2150), tagi, LINK);
  assert.equal(r.ok, false);
  assert.match(r.message, /limit to 2200/);
  const ok = buildCaption("a".repeat(2000), tagi, LINK);
  assert.equal(ok.ok, true);
  assert.ok(ok.caption.length <= 2200);
});

test("wymiar grafiki 1080×1350", () => {
  assert.equal(IG_WIDTH, 1080);
  assert.equal(IG_HEIGHT, 1350);
});

test("grafika posta nie wraca na serwer w historii rozmowy", () => {
  const BIG = "data:image/png;base64," + "A".repeat(100000);
  const msg = {
    id: "a",
    role: "assistant",
    parts: [{ type: "tool-postInstagram", state: "output-available", toolCallId: "c", input: {}, output: {
      ok: true, produkt: "Płyta BoardeX", link: LINK, opis: "x", hashtagi: [],
      grafika: { ok: true, url: BIG, mediaType: "image/png", modelId: "m", brand: "Azzura Group" },
      szerokosc: 1080, wysokosc: 1350,
    } }],
  };
  const out = stripOldImages([msg, { id: "u", role: "user", parts: [{ type: "text", text: "dzięki" }] }]);
  assert.equal(out[0].parts[0].output.grafika.url, "");
  assert.equal(out[0].parts[0].output.opis, "x");
  assert.equal(msg.parts[0].output.grafika.url, BIG);
});
