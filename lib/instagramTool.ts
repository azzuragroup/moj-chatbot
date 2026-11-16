import { tool } from "ai";
import { z } from "zod";
import { szukajProduktow } from "./catalogData";
import { generateBrandedImage } from "./imageGen";
import { IG_HEIGHT, IG_MAX_CAPTION, IG_MAX_HASHTAGS, IG_WIDTH, buildCaption } from "./instagramPost";

export type InstagramPost =
  | {
      ok: true;
      produkt: string;
      link: string;
      opis: string;
      hashtagi: string[];
      grafika:
        | { ok: true; url: string; mediaType: string; modelId: string | null; provider?: string | null; brand: string }
        | { ok: false; message: string };
      szerokosc: number;
      wysokosc: number;
    }
  | { ok: false; message: string };

/**
 * Szkic posta na Instagram: grafika 4:5 (do pobrania jako 1080×1350) w stylu
 * marki, opis z linkiem do produktu z katalogu i hashtagi. Niczego nie publikuje.
 */
export function createInstagramTool(apiKey: string) {
  return tool({
    description:
      "Tworzy gotowy szkic posta na Instagram dla Azzura Group: pionową grafikę 1080×1350 w stylu marki, " +
      `opis do ${IG_MAX_CAPTION} znaków i 5–${IG_MAX_HASHTAGS} hashtagów. Link do produktu narzędzie bierze z katalogu. ` +
      "Użyj, gdy użytkownik prosi o post na Instagram. Najpierw sprawdź fakty o produkcie w katalogProduktow. " +
      "Narzędzie niczego nie publikuje.",
    inputSchema: z.object({
      produkt: z.string().min(2).max(120).describe("Nazwa produktu z katalogu, np. „Płyta BoardeX”."),
      opis: z.string().min(20).max(IG_MAX_CAPTION).describe("Treść posta po polsku, bez linku i bez hashtagów."),
      hashtagi: z.array(z.string()).min(1).max(15).describe(`Od 5 do ${IG_MAX_HASHTAGS} hashtagów.`),
      grafika: z.string().min(5).max(400).describe("Krótki opis grafiki do posta, bez napisów na obrazie."),
    }),
    execute: async ({ produkt, opis, hashtagi, grafika }): Promise<InstagramPost> => {
      const znaleziony = szukajProduktow(produkt, 1)[0];
      if (!znaleziony) {
        return { ok: false, message: `Nie znaleziono produktu „${produkt}” w katalogu. Podaj nazwę z katalogu.` };
      }
      const post = buildCaption(opis, hashtagi, znaleziony.link);
      if (!post.ok) return post;
      const obraz = await generateBrandedImage(
        `${grafika}. Produkt: ${znaleziony.nazwa}. Format pionowy na Instagram.`,
        apiKey,
        "4:5",
      );
      return {
        ok: true,
        produkt: znaleziony.nazwa,
        link: znaleziony.link,
        opis: post.caption,
        hashtagi: post.hashtagi,
        grafika: obraz,
        szerokosc: IG_WIDTH,
        wysokosc: IG_HEIGHT,
      };
    },
    // Model dostaje tylko krótką informację, bez pliku grafiki.
    toModelOutput: ({ output }) => ({
      type: "text",
      value: output.ok
        ? `szkic posta na Instagram gotowy (${output.produkt}); grafika: ${
            output.grafika.ok ? "wygenerowana" : `nie udało się – ${output.grafika.message}`
          }`
        : `nie udało się przygotować posta: ${output.message}`,
    }),
  });
}
