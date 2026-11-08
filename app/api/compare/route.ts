import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { cookies } from "next/headers";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { COMPARE_INSTRUCTIONS } from "@/lib/prompt";
import {
  RESULT_FORMAT,
  TASKS,
  VARIANTS,
  isCorrect,
  parseResult,
  type VariantId,
} from "@/lib/compare";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) {
    return new Response("Brak dostępu. Zaloguj się.", { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;
  if (!apiKey || !modelId) {
    return new Response(
      "Brak konfiguracji serwera: uzupełnij OPENROUTER_API_KEY i OPENROUTER_MODEL.",
      { status: 500 },
    );
  }

  let taskId = "";
  try {
    ({ taskId } = await req.json());
  } catch {}
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) return new Response("Nieznane zadanie.", { status: 400 });

  const model = createOpenRouter({ apiKey }).chat(modelId);

  async function run(variant: VariantId) {
    try {
      const { text } = await generateText({
        model,
        instructions: COMPARE_INSTRUCTIONS,
        prompt: `${task!.question}\n\n${VARIANTS[variant]}\n${RESULT_FORMAT}`,
        maxOutputTokens: 800,
      });
      const result = parseResult(text);
      return { text, result, correct: isCorrect(result, task!.expected) };
    } catch {
      return { error: "Nie udało się uzyskać odpowiedzi od modelu." };
    }
  }

  const [plain, stepByStep] = await Promise.all([run("plain"), run("stepByStep")]);
  return Response.json({ plain, stepByStep });
}
