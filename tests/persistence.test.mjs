// Testy zapisu rozmów: tekst do bazy, obrazy jako „[obraz]”, kolejność po wczytaniu. Bez sieci.
import assert from "node:assert/strict";
import { test } from "node:test";
import { IMAGE_PLACEHOLDER, STOPPED_NOTE, messageToText, parseConversationId, rowsToMessages, titleFromText } from "../lib/chatPersistence.ts";

test("pytanie ze zdjęciem: tekst + [obraz], bez danych obrazu", () => {
  const msg = { role: "user", parts: [
    { type: "file", mediaType: "image/jpeg", url: "data:image/jpeg;base64,AAAA" },
    { type: "text", text: "Co to za płyta?" },
  ] };
  const text = messageToText(msg);
  assert.equal(text, `${IMAGE_PLACEHOLDER}\n\nCo to za płyta?`);
  assert.doesNotMatch(text, /base64/);
});

test("odpowiedź agenta: tylko tekst; wygenerowany obraz i post jako [obraz], narzędzia pominięte", () => {
  const msg = { role: "assistant", parts: [
    { type: "step-start" },
    { type: "tool-pogoda", state: "output-available", output: { miasto: "Praga" } },
    { type: "text", text: "Oto obraz:" },
    { type: "tool-generujObraz", state: "output-available", output: { ok: true, url: "data:image/png;base64,BBBB" } },
    { type: "tool-postInstagram", state: "output-available", output: { ok: true, opis: "Dragonwood na elewacji 🔵", hashtagi: ["#AzzuraGroup"], grafika: { url: "data:x" } } },
  ] };
  const text = messageToText(msg);
  assert.equal(text, "Oto obraz:\n\n[obraz]\n\n[obraz] Post na Instagram:\nDragonwood na elewacji 🔵\n#AzzuraGroup");
  assert.doesNotMatch(text, /base64|Praga/);
});

test("odpowiedź przerwana Stopem dostaje dopisek", () => {
  assert.equal(messageToText({ role: "assistant", parts: [{ type: "text", text: "Sprawdzam" }] }, { aborted: true }), `Sprawdzam\n\n${STOPPED_NOTE}`);
  assert.equal(messageToText({ role: "assistant", parts: [] }, { aborted: true }), STOPPED_NOTE);
});

test("wczytanie z bazy: kolejność po id, tylko user/assistant", () => {
  const rows = [
    { id: 12, role: "assistant", content: "Odpowiedź 1" },
    { id: 11, role: "user", content: "Pytanie 1" },
    { id: 13, role: "system", content: "x" },
    { id: 14, role: "user", content: "Pytanie 2" },
  ];
  assert.deepEqual(rowsToMessages(rows).map((m) => [m.id, m.role, m.parts[0].text]), [
    ["db-11", "user", "Pytanie 1"], ["db-12", "assistant", "Odpowiedź 1"], ["db-14", "user", "Pytanie 2"],
  ]);
});

test("tytuł z początku pierwszej wiadomości", () => {
  assert.equal(titleFromText("Napisz post o BoardeX"), "Napisz post o BoardeX");
  const long = titleFromText("Przygotuj szczegółową odpowiedź na zapytanie ofertowe od firmy budowlanej z Rzeszowa o płyty");
  assert.ok(long.length <= 61 && long.endsWith("…"));
  assert.equal(titleFromText("   "), "Nowa rozmowa");
});

test("numer rozmowy z zapytania tylko jako dodatnia liczba", () => {
  assert.equal(parseConversationId(5), 5);
  assert.equal(parseConversationId("7"), 7);
  assert.equal(parseConversationId(null), null);
  assert.equal(parseConversationId(-1), null);
  assert.equal(parseConversationId("1; drop table"), null);
});

import { messagesLabel } from "../lib/chatPersistence.ts";

test("liczba wiadomości po polsku", () => {
  assert.equal(messagesLabel(1), "1 wiadomość");
  assert.equal(messagesLabel(4), "4 wiadomości");
  assert.equal(messagesLabel(12), "12 wiadomości");
  assert.equal(messagesLabel(0), "0 wiadomości");
});

import { cleanTitle } from "../lib/chatPersistence.ts";

test("tytuł od modelu: porządkowanie i limit 5 słów", () => {
  assert.equal(cleanTitle("„Post LinkedIn o BoardeX”."), "Post LinkedIn o BoardeX");
  assert.equal(cleanTitle("Tytuł: **Odpowiedź na zapytanie ofertowe**"), "Odpowiedź na zapytanie ofertowe");
  assert.equal(cleanTitle("Opis drewna Dragonwood na elewację domu jednorodzinnego"), "Opis drewna Dragonwood na elewację");
  assert.equal(cleanTitle("\n\nKarta techniczna Fibrex\nDruga linia"), "Karta techniczna Fibrex");
  assert.equal(cleanTitle("   "), null);
});
