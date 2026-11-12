import {
  APICallError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ANALYSIS_INSTRUCTIONS, INSTRUCTIONS } from "./prompt";
import {
  analysisSchema,
  classifyModelFailure,
  classifyProviderError,
  enforceReviewRules,
  validateAnalysis,
  type ValidationResult,
} from "./analysis";
import { buildAnalysisPrompt, enforceReviewOnCommands } from "./input";
import { describeModelError } from "./images";
import { createImageTool } from "./imageGen";
import { aktualnyCzas } from "./tools";
import { pogoda } from "./weather";
import { MAX_STEPS, hitStepLimit } from "./steps";

type Config = { apiKey: string; modelId: string };

/** Tryb "chat": rozmowa ze streamingiem i narzędziami. */
export async function runChat(messages: UIMessage[], { apiKey, modelId }: Config) {
  const openrouter = createOpenRouter({ apiKey });
  const tools = {
    // Wyszukiwanie wykonuje OpenRouter po swojej stronie (server tool).
    web_search: openrouter.tools.webSearch({ maxResults: 3, engine: "native" }),
    aktualnyCzas,
    pogoda,
    generujObraz: createImageTool(apiKey),
  };

  const result = streamText({
    model: openrouter.chat(modelId),
    instructions: INSTRUCTIONS,
    // tools: wyniki narzędzi z historii też przechodzą przez toModelOutput,
    // więc model nigdy nie dostaje pliku obrazu, tylko krótki tekst.
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    // Diagnostyka kroków: tylko nazwy i liczby, bez treści rozmowy.
    onStepEnd: (step) => {
      const types: Record<string, number> = {};
      for (const c of step.content) types[c.type] = (types[c.type] ?? 0) + 1;
      console.info("[agent] krok", {
        koniec: step.finishReason,
        narzedzia: step.toolCalls.map((t) => t.toolName),
        zrodla: step.sources.length,
        czesci: types,
        przypisyWTekscie: /\[\d+\]/.test(step.text),
        metadaneDostawcy: Object.fromEntries(
          Object.entries(step.providerMetadata ?? {}).map(([k, v]) => [k, Object.keys(v ?? {})]),
        ),
      });
    },
  });

  let usedModel: string | undefined;
  let steps = 0;

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendSources: true,
      // Na końcu: czas pobrania źródeł i model, który faktycznie odpowiedział
      // (pole "model" z odpowiedzi API, przekazane przez SDK w finish-step).
      messageMetadata: ({ part }) => {
        if (part.type === "finish-step") {
          steps += 1;
          usedModel = part.response.modelId;
        }
        if (part.type === "finish") {
          return {
            fetchedAt: new Date().toISOString(),
            modelId: usedModel,
            stoppedAtLimit: hitStepLimit(steps, part.finishReason),
          };
        }
        return undefined;
      },
      onError: (error) =>
        APICallError.isInstance(error)
          ? describeModelError(error.statusCode, `${error.message} ${error.responseBody ?? ""}`, "chat")
          : describeModelError(undefined, undefined, "chat"),
    }),
  });
}

function reply(result: ValidationResult) {
  if (result.ok) return Response.json(result);
  const status = result.kind === "config" ? 503 : 502;
  return Response.json(result, { status });
}

/** Tryb "analyze": wynik strukturalny sprawdzany schematem na serwerze. */
export async function runAnalyze(message: string, { apiKey, modelId }: Config) {
  // require_parameters: OpenRouter wybiera tylko dostawców obsługujących
  // structured output, zamiast po cichu go pominąć.
  const model = createOpenRouter({ apiKey }).chat(modelId, {
    provider: { require_parameters: true },
  });

  try {
    const result = await generateText({
      model,
      instructions: ANALYSIS_INSTRUCTIONS,
      prompt: buildAnalysisPrompt(message),
      output: Output.object({ name: "analiza", schema: analysisSchema }),
      maxOutputTokens: 1000,
    });
    if (result.finishReason !== "stop") {
      return reply(classifyModelFailure(result.finishReason, result.text));
    }
    // Druga, niezależna walidacja: nic nie jest uzupełniane ani poprawiane.
    const validated = validateAnalysis(result.output);
    if (!validated.ok) return reply(validated);
    return reply({
      ok: true,
      analysis: enforceReviewOnCommands(enforceReviewRules(validated.analysis), message),
    });
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return reply(classifyModelFailure(error.finishReason, error.text));
    }
    if (NoOutputGeneratedError.isInstance(error)) {
      return reply(classifyModelFailure(undefined, undefined));
    }
    if (APICallError.isInstance(error)) {
      return reply(classifyProviderError(error.statusCode, error.responseBody));
    }
    return reply(classifyProviderError(undefined, undefined));
  }
}
