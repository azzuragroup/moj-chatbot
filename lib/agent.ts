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
import { ANALYSIS_INSTRUCTIONS, INSTRUCTIONS, PLANNER_INSTRUCTIONS, TRAVEL_SUMMARY_INSTRUCTIONS } from "./prompt";
import { z } from "zod";
import { getHolidays } from "./holidays";
import { findProduct, productFacts } from "./planner";
import { containsPrice, planMonth, weekdayPl } from "./plannerCore";
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
import { czas } from "./tools";
import { pogoda } from "./weather";
import { waluty } from "./currency";
import { swieta } from "./holidays";
import { wikipedia } from "./wikipedia";
import { kalkulator } from "./calculator";
import { notatki } from "./notes";
import { sprawdzFirme } from "./company";
import { createDiagnosticsTool } from "./diagnostics";
import { katalogProduktow } from "./catalog";
import { createInstagramTool } from "./instagramTool";
import { MAX_STEPS, hitStepLimit, isLastStep } from "./steps";
import { completeSentences, endsWithSentence } from "./travelHelpers";
import {
  SLOW_TOOLS,
  TASK_TIMEOUT_MS,
  TOOL_TIMEOUT_MS,
  createToolGuard,
  guardTools,
  summaryInstruction,
  type StopReason,
} from "./guard";

type Config = { apiKey: string; modelId: string };

/** Tryb "chat": rozmowa ze streamingiem i narzędziami. */
export async function runChat(
  messages: UIMessage[],
  { apiKey, modelId }: Config,
  abortSignal?: AbortSignal,
) {
  const openrouter = createOpenRouter({ apiKey });
  const baseTools = {
    // Wyszukiwanie wykonuje OpenRouter po swojej stronie (server tool).
    web_search: openrouter.tools.webSearch({ maxResults: 3, engine: "native" }),
    pogoda,
    waluty,
    swieta,
    wikipedia,
    kalkulator,
    czas,
    notatki,
    sprawdzFirme,
    katalogProduktow,
    postInstagram: createInstagramTool(apiKey),
    generujObraz: createImageTool(apiKey),
  };
  // Strażnik: najwyżej 16 wywołań narzędzi, 10 s na źródło, bez powtarzania
  // nieudanych wywołań. Liczy osobno od kroków modelu.
  const guard = createToolGuard();
  const tools = guardTools(
    {
      ...baseTools,
      diagnostyka: createDiagnosticsTool({
        modelId,
        toolNames: [...Object.keys(baseTools), "diagnostyka"],
        maxSteps: MAX_STEPS,
      }),
    },
    guard,
  );

  // Ustawiane w prepareStep, gdy agent musi kończyć: limit kroków, narzędzi albo czasu.
  let stopReason: StopReason | null = null;

  const result = streamText({
    model: openrouter.chat(modelId),
    instructions: INSTRUCTIONS,
    // tools: wyniki narzędzi z historii też przechodzą przez toModelOutput,
    // więc model nigdy nie dostaje pliku obrazu, tylko krótki tekst.
    // ignoreIncompleteToolCalls: odpowiedź przerwana przyciskiem Stop może mieć
    // narzędzie bez wyniku – pomijamy je, żeby kolejne pytanie działało.
    messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
    abortSignal,
    onAbort: ({ steps }) => {
      console.info("[agent] przerwane przez użytkownika", { kroki: steps.length, narzedzia: guard.calls });
    },
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    // Twarde limity czasu: całe zadanie 60 s; narzędzie – zapas ponad 10 s strażnika
    // (obrazy mają dłuższy limit, bo to generowanie, nie odczyt danych).
    timeout: {
      totalMs: TASK_TIMEOUT_MS,
      toolMs: TOOL_TIMEOUT_MS + 1000,
      tools: {
        generujObrazMs: SLOW_TOOLS.generujObraz + 5000,
        postInstagramMs: SLOW_TOOLS.postInstagram + 5000,
      },
    },
    // Pętla ReAct: narzędzie → wynik → decyzja. Gdy kończą się kroki, wywołania
    // narzędzi albo czas, zabraniamy narzędzi i prosimy o wynik częściowy.
    prepareStep: ({ stepNumber }) => {
      const reason: StopReason | null = isLastStep(stepNumber) ? "kroki" : guard.stopReason();
      if (!reason) return {};
      stopReason ??= reason;
      return {
        toolChoice: "none",
        instructions: `${INSTRUCTIONS}\n\n${summaryInstruction(reason, MAX_STEPS)}`,
      };
    },
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
            stoppedAtLimit: stopReason !== null || hitStepLimit(steps, part.finishReason),
            stopReason: stopReason ?? (hitStepLimit(steps, part.finishReason) ? "kroki" : undefined),
            maxSteps: MAX_STEPS,
            stats: { kroki: steps, wywolaniaNarzedzi: guard.calls, czasMs: guard.elapsedMs() },
          };
        }
        return undefined;
      },
      onError: (error) =>
        (error as { name?: string } | null)?.name === "TimeoutError"
          ? `Zadanie przekroczyło ${TASK_TIMEOUT_MS / 1000} sekund i zostało przerwane. Powyżej to, co agent zdążył ustalić – zadaj pytanie w mniejszych częściach.`
          : APICallError.isInstance(error)
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

/** Krótkie podsumowanie podróży (2–3 zdania) na podstawie danych z kart. */
export async function runTravelSummary(prompt: string, { apiKey, modelId }: Config) {
  const model = createOpenRouter({ apiKey }).chat(modelId);

  // Limit tokenów obejmuje też „myślenie” modelu (rozumowanie). Przy 300 tokenach
  // model rozumujący zużywał prawie wszystko na myślenie i tekst się urywał.
  // Dlatego: większy limit, niskie rozumowanie i sprawdzenie, czy tekst jest pełny.
  const attempt = async (maxOutputTokens: number) => {
    const result = await generateText({
      model,
      instructions: TRAVEL_SUMMARY_INSTRUCTIONS,
      prompt,
      maxOutputTokens,
      reasoning: "low",
      timeout: { totalMs: 25_000 },
    });
    const text = result.text.trim();
    const complete = result.finishReason === "stop" && endsWithSentence(text);
    // Diagnostyka: tylko liczby, bez treści.
    console.info("[podsumowanie]", {
      koniec: result.finishReason,
      limit: maxOutputTokens,
      tokenyTekstu: result.usage.outputTokenDetails?.textTokens,
      tokenyRozumowania: result.usage.outputTokenDetails?.reasoningTokens,
      pelne: complete,
    });
    return { text, complete };
  };

  try {
    let { text, complete } = await attempt(1500);
    // Druga próba z większym zapasem, gdy model urwał w pół zdania.
    if (!complete) ({ text, complete } = await attempt(3000));
    const summary = completeSentences(text, 3);
    if (!summary) {
      return Response.json(
        { ok: false, message: "Model nie dokończył podsumowania. Kliknij „Spróbuj ponownie”." },
        { status: 502 },
      );
    }
    return Response.json({ ok: true, podsumowanie: summary, pobrano: new Date().toISOString() });
  } catch (error) {
    const message = APICallError.isInstance(error)
      ? describeModelError(error.statusCode, `${error.message} ${error.responseBody ?? ""}`, "chat")
      : "Nie udało się przygotować podsumowania. Spróbuj ponownie.";
    return Response.json({ ok: false, message }, { status: 502 });
  }
}

// ---------- Planer social media: szkice na jeden tydzień ----------

const weekDraftSchema = z.object({
  posty: z
    .array(
      z.object({
        data: z.string().describe("Data posta RRRR-MM-DD, taka jak w zadaniu."),
        linkedin: z.string().min(80).max(3000).describe("Szkic posta LinkedIn."),
        instagram: z.string().min(80).max(2200).describe("Szkic opisu posta Instagram."),
      }),
    )
    .min(1)
    .max(5),
});

export type WeekDraft = { data: string; linkedin: string; instagram: string; uwagi: string[] };

/** Dopisuje link do produktu, jeśli model go pominął. */
function ensureLink(text: string, link: string) {
  return text.includes(link) ? text.trim() : `${text.trim()}\n\n${link}`;
}

/** Okazje (święta PL) dla dat – liczone na serwerze tak samo jak w planie. */
async function occasionsFor(dates: string[]) {
  const result = new Map<string, string[] | null>();
  for (const month of [...new Set(dates.map((d) => d.slice(0, 7)))]) {
    const holidays = await getHolidays("PL", Number(month.slice(0, 4)));
    const list = "blad" in holidays ? null : holidays.swieta.map((h) => ({ data: h.data, nazwa: h.nazwa }));
    const plan = planMonth(month, list);
    const byDate = new Map(plan.tygodnie.flatMap((w) => w.posty).map((p) => [p.data, p.okazje]));
    for (const d of dates.filter((x) => x.startsWith(month))) {
      result.set(d, byDate.get(d) ?? (list ? list.filter((h) => h.data === d).map((h) => h.nazwa) : null));
    }
  }
  return result;
}

/** Jedno wywołanie modelu na tydzień: szkice LinkedIn i Instagram dla 1–5 postów. */
export async function runWeekDrafts(posts: { data: string; slug: string }[], { apiKey, modelId }: Config) {
  const products = posts.map((p) => findProduct(p.slug));
  if (products.some((p) => !p)) {
    return Response.json({ ok: false, message: "Nieznany produkt w planie. Odśwież plan." }, { status: 400 });
  }
  const occasions = await occasionsFor(posts.map((p) => p.data));
  const items = posts.map((p, i) => ({
    data: p.data,
    dzienTygodnia: weekdayPl(p.data),
    okazje: occasions.get(p.data) ?? [],
    produkt: productFacts(products[i]!),
  }));
  const prompt =
    `Przygotuj szkice dla ${items.length} postów.\n<dane>\n${JSON.stringify(items, null, 1)}\n</dane>\n` +
    `Gdy „okazje” to pusta lista albo null – brak okazji, nie wymyślaj żadnej.`;

  const model = createOpenRouter({ apiKey }).chat(modelId, { provider: { require_parameters: true } });
  try {
    const result = await generateText({
      model,
      instructions: PLANNER_INSTRUCTIONS,
      prompt,
      output: Output.object({ name: "szkice_tygodnia", schema: weekDraftSchema }),
      // Zapas na rozumowanie modelu, żeby tekst nie był ucinany.
      maxOutputTokens: 8000,
      reasoning: "low",
      timeout: { totalMs: 55_000 },
    });
    console.info("[planer] tydzień", {
      koniec: result.finishReason,
      posty: items.length,
      tokenyTekstu: result.usage.outputTokenDetails?.textTokens,
      tokenyRozumowania: result.usage.outputTokenDetails?.reasoningTokens,
    });
    if (result.finishReason !== "stop") {
      return Response.json(
        { ok: false, message: "Model nie dokończył szkiców. Kliknij „Rozpisz tydzień” jeszcze raz." },
        { status: 502 },
      );
    }
    const byDate = new Map(result.output.posty.map((p) => [p.data, p]));
    const szkice: WeekDraft[] = [];
    for (const [i, item] of items.entries()) {
      const draft = byDate.get(item.data) ?? result.output.posty[i];
      if (!draft) continue;
      const link = item.produkt.link;
      const linkedin = ensureLink(draft.linkedin, link);
      const instagram = ensureLink(draft.instagram, link);
      const uwagi: string[] = [];
      if (containsPrice(linkedin) || containsPrice(instagram)) uwagi.push("Sprawdź: w szkicu pojawia się cena lub kwota.");
      if (!/#\p{L}/u.test(instagram)) uwagi.push("Sprawdź: brak hashtagów w szkicu Instagram.");
      szkice.push({ data: item.data, linkedin, instagram, uwagi });
    }
    if (szkice.length === 0) {
      return Response.json({ ok: false, message: "Model nie zwrócił szkiców. Spróbuj ponownie." }, { status: 502 });
    }
    return Response.json({
      ok: true,
      szkice,
      zrodla: ["Katalog produktów Azzura Group (azzuragroup.com)", "Nager.Date (date.nager.at)", "Szkic: model AI (OpenRouter)"],
      przygotowano: new Date().toISOString(),
    });
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
      return Response.json(
        { ok: false, message: "Model zwrócił szkice w złym formacie. Kliknij „Rozpisz tydzień” jeszcze raz." },
        { status: 502 },
      );
    }
    const message = APICallError.isInstance(error)
      ? describeModelError(error.statusCode, `${error.message} ${error.responseBody ?? ""}`, "chat")
      : (error as { name?: string } | null)?.name === "TimeoutError"
        ? "Model nie zdążył w 55 sekund. Spróbuj ponownie."
        : "Nie udało się przygotować szkiców. Spróbuj ponownie.";
    return Response.json({ ok: false, message }, { status: 502 });
  }
}
