// Test pętli agenta na udawanym modelu (bez sieci i bez płatnych wywołań).
// Model za każdym razem chce użyć narzędzia – sprawdzamy limit i podsumowanie.
import assert from "node:assert/strict";
import { test } from "node:test";
import { generateText, isStepCount, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { LIMIT_INSTRUCTION, MAX_STEPS, isLastStep } from "../lib/steps.ts";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

test("agent, który ciągle chce narzędzi, kończy po 6 krokach podsumowaniem", async () => {
  let toolRuns = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      // W ostatnim kroku toolChoice = none → model musi odpowiedzieć tekstem.
      if (options.toolChoice?.type === "none") {
        return { content: [{ type: "text", text: "Ustaliłem: 5 wyników." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
      }
      return {
        content: [{ type: "tool-call", toolCallId: `c${toolRuns}`, toolName: "licz", input: "{}" }],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
  let forced = false;
  const result = await generateText({
    model,
    instructions: "Test",
    prompt: "Zadanie bez końca",
    tools: { licz: tool({ inputSchema: z.object({}), execute: async () => ({ wynik: ++toolRuns }) }) },
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber }) => {
      if (!isLastStep(stepNumber)) return {};
      forced = true;
      return { toolChoice: "none", instructions: `Test\n\n${LIMIT_INSTRUCTION}` };
    },
  });
  assert.equal(result.steps.length, 6);
  assert.equal(toolRuns, 5, "5 kroków z narzędziem, 6. bez");
  assert.equal(forced, true);
  assert.equal(result.text, "Ustaliłem: 5 wyników.");
  const lastCall = model.doGenerateCalls.at(-1);
  assert.equal(lastCall.toolChoice.type, "none");
  assert.match(JSON.stringify(lastCall.prompt), /Nie używaj już narzędzi/);
});

test("krótkie zadanie nie dochodzi do limitu i nie wymusza podsumowania", async () => {
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      calls += 1;
      return calls === 1
        ? { content: [{ type: "tool-call", toolCallId: "a", toolName: "licz", input: "{}" }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] }
        : { content: [{ type: "text", text: "Gotowe." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  });
  let forced = false;
  const result = await generateText({
    model,
    prompt: "Krótko",
    tools: { licz: tool({ inputSchema: z.object({}), execute: async () => ({ ok: true }) }) },
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber }) => (isLastStep(stepNumber) ? ((forced = true), { toolChoice: "none" }) : {}),
  });
  assert.equal(result.steps.length, 2);
  assert.equal(forced, false);
  assert.equal(result.text, "Gotowe.");
});
