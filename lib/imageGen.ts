import { APICallError, NoImageGeneratedError, generateImage, tool } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { BRAND_ASPECT_RATIO, BRAND_NAME, buildBrandedPrompt } from "./brand";
import {
  describeModelError,
  imageToolSpec,
  generationIdFrom,
  modelFromGenerationStats,
  reportedModel,
} from "./images";

// Nano Banana 2.
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

import type { ImageResult } from "./images";

/** Pyta OpenRouter o statystyki wywołania. Dane mogą pojawić się z opóźnieniem. */
async function modelFromStats(apiKey: string, id: string) {
  // Statystyki pojawiają się z opóźnieniem: czekamy 1, 2, 3 i 4 s (razem ok. 10 s).
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    try {
      const res = await fetch(
        `https://openrouter.ai/api/v1/generation?${new URLSearchParams({ id })}`,
        { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(3000) },
      );
      if (res.ok) {
        const model = modelFromGenerationStats(await res.json());
        if (model) return model;
      }
      console.info("[obraz] statystyki wywołania", { proba: attempt + 1, status: res.status });
    } catch {}
  }
  return undefined;
}

/** Generuje obraz w stylu marki. Nigdy nie rzuca błędu. */
export async function generateBrandedImage(prompt: string, apiKey: string): Promise<ImageResult> {
  // Biblioteka podaje dla obrazów tylko nazwę, o którą prosiliśmy. Faktyczny
  // model bierzemy z odpowiedzi API: z pola "model" albo ze statystyk wywołania.
  let apiModel: string | undefined;
  let generationId: string | undefined;
  let providerName: string | undefined;
  const openrouter = createOpenRouter({
    apiKey,
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      try {
        const json = await res.clone().json();
        apiModel = reportedModel(json);
        generationId = generationIdFrom(res.headers, json);
        providerName = res.headers.get("x-provider-name") ?? undefined;
        // Diagnostyka: tylko nazwy nagłówków i pól, bez wartości i bez danych obrazu.
        console.info("[obraz] odpowiedź API", {
          status: res.status,
          naglowki: [...res.headers.keys()],
          pola: json && typeof json === "object" ? Object.keys(json) : [],
          model: apiModel ?? null,
          generationId: generationId ? "jest" : "brak",
        });
      } catch {}
      return res;
    },
  });

  try {
    const { image } = await generateImage({
      model: openrouter.imageModel(IMAGE_MODEL),
      prompt: buildBrandedPrompt(prompt),
      aspectRatio: BRAND_ASPECT_RATIO,
    });
    if (!apiModel && generationId) apiModel = await modelFromStats(apiKey, generationId);
    return {
      ok: true,
      url: `data:${image.mediaType};base64,${image.base64}`,
      mediaType: image.mediaType,
      modelId: apiModel ?? null,
      provider: providerName ?? null,
      brand: BRAND_NAME,
    };
  } catch (error) {
    if (NoImageGeneratedError.isInstance(error)) {
      return { ok: false, message: "Model nie wygenerował obrazu. Spróbuj innego opisu." };
    }
    if (APICallError.isInstance(error)) {
      // Diagnostyka: status i komunikat dostawcy (bez klucza i bez treści obrazu).
      console.info("[obraz] błąd API", { status: error.statusCode, komunikat: error.message });
      return {
        ok: false,
        message: describeModelError(error.statusCode, `${error.message} ${error.responseBody ?? ""}`, "image"),
      };
    }
    console.info("[obraz] inny błąd", { komunikat: error instanceof Error ? error.message : String(error) });
    return { ok: false, message: describeModelError(undefined, undefined, "image") };
  }
}

/**
 * Narzędzie generowania obrazu dla czatu. Plik trafia do przeglądarki,
 * a do modelu wraca tylko krótki tekst (toModelOutput).
 */
export function createImageTool(apiKey: string) {
  return tool({
    description: imageToolSpec.description,
    inputSchema: imageToolSpec.inputSchema,
    execute: async ({ opis }: { opis: string }): Promise<ImageResult> =>
      generateBrandedImage(opis, apiKey),
    toModelOutput: ({ output }) => imageToolSpec.toModelOutput({ output }),
  });
}
