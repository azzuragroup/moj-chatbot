/** Limity Instagrama dla szkicu posta. */
export const IG_MAX_CAPTION = 2200;
export const IG_MIN_HASHTAGS = 5;
export const IG_MAX_HASHTAGS = 10;
export const IG_WIDTH = 1080;
export const IG_HEIGHT = 1350;

export type CaptionResult =
  | { ok: true; caption: string; hashtagi: string[] }
  | { ok: false; message: string };

/** Ujednolica hashtagi: znak #, bez spacji i bez powtórzeń. */
export function normalizeHashtags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = "#" + raw.trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (tag.length < 2 || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out;
}

/**
 * Składa opis posta: treść, link do produktu i hashtagi. Sprawdza limity
 * Instagrama. Przy przekroczeniu zwraca komunikat, a nie przycina tekstu.
 */
export function buildCaption(opis: string, hashtagi: string[], link: string): CaptionResult {
  const tags = normalizeHashtags(hashtagi);
  if (tags.length < IG_MIN_HASHTAGS || tags.length > IG_MAX_HASHTAGS) {
    return {
      ok: false,
      message: `Post musi mieć od ${IG_MIN_HASHTAGS} do ${IG_MAX_HASHTAGS} hashtagów (jest ${tags.length}).`,
    };
  }
  const caption = [opis.trim(), `Więcej o produkcie: ${link}`, tags.join(" ")].join("\n\n");
  if (caption.length > IG_MAX_CAPTION) {
    return {
      ok: false,
      message: `Opis z linkiem i hashtagami ma ${caption.length} znaków, a limit to ${IG_MAX_CAPTION}. Skróć treść.`,
    };
  }
  return { ok: true, caption, hashtagi: tags };
}
