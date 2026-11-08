import {
  APICallError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  generateText,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { cookies } from "next/headers";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { ANALYSIS_INSTRUCTIONS } from "@/lib/prompt";
import {
  analysisSchema,
  classifyModelFailure,
  classifyProviderError,
  validateAnalysis,
  type ValidationResult,
} from "@/lib/analysis";
import { buildAnalysisPrompt, parseAnalyzeRequest } from "@/lib/input";

export const maxDuration = 60;

function reply(result: ValidationResult) {
  if (result.ok) return Response.json(result);
  const status = result.kind === "config" ? 503 : 502;
  return Response.json(result, { status });
}

export async function POST(req: Request) {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) {
    return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {}
  const request = parseAnalyzeRequest(body);
  if (!request.ok) {
    return new Response(request.error, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  if (!apiKey || !modelId) {
    return Response.json(
      {
        ok: false,
        kind: "config",
        message:
          "Brak konfiguracji serwera: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL.",
        issues: [],
      },
      { status: 503 },
    );
  }

  // require_parameters: OpenRouter wybiera tylko dostawców obsługujących
  // structured output, zamiast po cichu go pominąć.
  const model = createOpenRouter({ apiKey }).chat(modelId, {
    provider: { require_parameters: true },
  });

  try {
    const result = await generateText({
      model,
      instructions: ANALYSIS_INSTRUCTIONS,
      prompt: buildAnalysisPrompt(request.message),
      output: Output.object({ name: "analiza", schema: analysisSchema }),
      maxOutputTokens: 1000,
    });
    if (result.finishReason !== "stop") {
      return reply(classifyModelFailure(result.finishReason, result.text));
    }
    // Druga, niezależna walidacja: nic nie jest uzupełniane ani poprawiane.
    return reply(validateAnalysis(result.output));
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
