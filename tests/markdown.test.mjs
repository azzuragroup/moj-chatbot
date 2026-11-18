// Testy wyświetlania markdown w odpowiedziach agenta. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInline, parseMarkdown } from "../components/markdown.ts";

test("pogrubienie i kursywa zamiast gwiazdek", () => {
  assert.deepEqual(parseInline("To **BoardeX** i *Fibrex*."), [
    { type: "text", text: "To " },
    { type: "bold", children: [{ type: "text", text: "BoardeX" }] },
    { type: "text", text: " i " },
    { type: "italic", children: [{ type: "text", text: "Fibrex" }] },
    { type: "text", text: "." },
  ]);
});

test("link w pogrubieniu i kod", () => {
  const parts = parseInline("**[BoardeX](https://azzuragroup.com/produkty/plyta-boardex/)** i `12,5 mm`");
  assert.deepEqual(parts[0], { type: "bold", children: [{ type: "link", text: "BoardeX", href: "https://azzuragroup.com/produkty/plyta-boardex/" }] });
  assert.deepEqual(parts[2], { type: "code", text: "12,5 mm" });
});

test("bez fałszywego formatowania: snake_case, gwiazdka w mnożeniu, hashtagi", () => {
  assert.deepEqual(parseInline("styl_odpowiedzi"), [{ type: "text", text: "styl_odpowiedzi" }]);
  assert.deepEqual(parseInline("1,2 * 2,4 m"), [{ type: "text", text: "1,2 * 2,4 m" }]);
  assert.deepEqual(parseMarkdown("#AzzuraGroup #BoardeX")[0].type, "paragraph");
});

test("bloki: nagłówek, lista, lista numerowana, akapit z nową linią", () => {
  const blocks = parseMarkdown("## Plan\n- Post LinkedIn\n- Post **Instagram**\n\n1. Krok\n2. Krok\n\nLinia 1\nLinia 2");
  assert.deepEqual(blocks.map((b) => b.type), ["heading", "list", "list", "paragraph"]);
  assert.equal(blocks[1].ordered, false);
  assert.equal(blocks[1].items.length, 2);
  assert.equal(blocks[2].ordered, true);
  assert.equal(blocks[3].lines.length, 2);
});

test("cytat i linia nie zawieszają parsera", () => {
  const blocks = parseMarkdown("> Cytat 1\n> Cytat 2\n---\nKoniec");
  assert.deepEqual(blocks.map((b) => b.type), ["quote", "hr", "paragraph"]);
});

test("HTML od modelu zostaje zwykłym tekstem", () => {
  const blocks = parseMarkdown('<img src=x onerror="alert(1)"> **ok**');
  assert.equal(blocks[0].lines[0][0].type, "text");
  assert.match(blocks[0].lines[0][0].text, /<img/);
});

test("link javascript: nie staje się linkiem", () => {
  const parts = parseInline("[kliknij](javascript:alert(1))");
  assert.ok(parts.every((p) => p.type !== "link"));
});
