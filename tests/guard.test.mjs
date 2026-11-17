// Testy limitów agenta: wywołania narzędzi, czas, brak powtórek. Bez sieci i bez modelu.
import assert from "node:assert/strict";
import { test } from "node:test";
import { generateText, isStepCount, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { MAX_TOOL_CALLS, TASK_TIMEOUT_MS, TOOL_TIMEOUT_MS, createToolGuard, guardTools, summaryInstruction } from "../lib/guard.ts";
import { MAX_STEPS, isLastStep } from "../lib/steps.ts";

test("stałe limitów zgodne z założeniami", () => {
  assert.equal(MAX_TOOL_CALLS, 16);
  assert.equal(TOOL_TIMEOUT_MS, 10_000);
  assert.equal(TASK_TIMEOUT_MS, 60_000);
});

test("limit wywołań: 17. wywołanie nie uruchamia narzędzia", async () => {
  const guard = createToolGuard();
  let runs = 0;
  for (let i = 0; i < 16; i++) await guard.run("licz", { i }, () => ({ ok: ++runs }));
  const r = await guard.run("licz", { i: 99 }, () => ({ ok: ++runs }));
  assert.equal(runs, 16);
  assert.equal(guard.calls, 16);
  assert.match(r.blad, /limit 16 wywołań/);
  assert.equal(guard.stopReason(), "narzedzia");
});

test("źródło nie odpowiada po limicie czasu narzędzia", async () => {
  const guard = createToolGuard({ toolTimeoutMs: 30 });
  const r = await guard.run("pogoda", { miasto: "Praga" }, () => new Promise(() => {}));
  assert.match(r.blad, /Źródło nie odpowiada \(narzędzie pogoda/);
  assert.ok(r.pobrano);
});

test("nieudane wywołanie nie jest powtarzane z tymi samymi danymi", async () => {
  const guard = createToolGuard();
  let runs = 0;
  const fail = () => {
    runs++;
    return { blad: "Źródło nie odpowiada (NBP)." };
  };
  await guard.run("waluty", { waluta: "CZK" }, fail);
  const again = await guard.run("waluty", { waluta: "CZK" }, fail);
  assert.equal(runs, 1);
  assert.match(again.blad, /już się nie udało. Nie powtarzaj/);
  // Inne dane – wolno spróbować.
  await guard.run("waluty", { waluta: "EUR" }, fail);
  assert.equal(runs, 2);
});

test("wyjątek w narzędziu zamienia się w czytelny błąd", async () => {
  const guard = createToolGuard();
  const r = await guard.run("swieta", {}, () => {
    throw new Error("boom");
  });
  assert.match(r.blad, /zgłosiło błąd/);
});

test("po miękkim terminie nowe narzędzia nie startują", async () => {
  let t = 0;
  const guard = createToolGuard({ now: () => t, summaryAfterMs: 45_000 });
  t = 46_000;
  const r = await guard.run("czas", {}, () => ({ ok: true }));
  assert.match(r.blad, /Kończy się czas/);
  assert.equal(guard.stopReason(), "czas");
  assert.equal(guard.elapsedMs(), 46_000);
});

test("guardTools owija lokalne narzędzia, a narzędzie dostawcy zostawia", async () => {
  const guard = createToolGuard();
  const provider = { type: "provider", id: "x.search" };
  const local = tool({ inputSchema: z.object({}), execute: async () => ({ ok: true }) });
  const wrapped = guardTools({ web_search: provider, local }, guard);
  assert.equal(wrapped.web_search, provider);
  assert.notEqual(wrapped.local.execute, local.execute);
  await wrapped.local.execute({}, { toolCallId: "1", messages: [] });
  assert.equal(guard.calls, 1);
});

test("instrukcja podsumowania mówi, czego nie udało się sprawdzić", () => {
  assert.match(summaryInstruction("narzedzia", 6), /limit 16 wywołań/);
  assert.match(summaryInstruction("czas", 6), /60 sekund/);
  assert.match(summaryInstruction("kroki", 6), /6\. krok/);
  assert.match(summaryInstruction("czas", 6), /czego nie udało się sprawdzić/);
});

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

test("pętla: model zasypuje narzędziami → limit 16, potem wynik częściowy", async () => {
  let n = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      if (options.toolChoice?.type === "none") {
        return { content: [{ type: "text", text: "Wynik częściowy." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
      }
      // 5 równoległych wywołań w każdym kroku.
      const content = Array.from({ length: 5 }, () => ({ type: "tool-call", toolCallId: `c${n++}`, toolName: "licz", input: JSON.stringify({ n }) }));
      return { content, finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] };
    },
  });
  const guard = createToolGuard();
  let runs = 0;
  const tools = guardTools({ licz: tool({ inputSchema: z.object({ n: z.number() }), execute: async () => ({ ok: ++runs }) }) }, guard);
  let reason = null;
  const result = await generateText({
    model,
    prompt: "Dużo pracy",
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber }) => {
      const r = isLastStep(stepNumber) ? "kroki" : guard.stopReason();
      if (!r) return {};
      reason ??= r;
      return { toolChoice: "none" };
    },
  });
  assert.equal(runs, 16, "narzędzie wykonane dokładnie 16 razy");
  assert.equal(reason, "narzedzia");
  assert.equal(result.text, "Wynik częściowy.");
  assert.ok(result.steps.length <= MAX_STEPS);
});
