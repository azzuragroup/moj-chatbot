/** Stały styl marki Azzura Group dla każdego generowanego obrazu. */
export const BRAND_NAME = "Azzura Group";
export const BRAND_ASPECT_RATIO = "16:9" as const;

export const BRAND_STYLE = [
  "nowoczesna architektura i materiały budowlane w zastosowaniu (elewacje, wnętrza, konstrukcje)",
  "fotorealistyczny, profesjonalny styl, naturalne światło",
  "akcenty granatu (#082D49) i błękitu Azzury (#027DC7), stonowane neutralne tło",
  "spokojny, rzeczowy, premium nastrój marki B2B",
  "czysta kompozycja z wolnym miejscem",
  "bez napisów, liter, cyfr, znaków wodnych i logo innych firm",
].join("; ");

/**
 * Łączy opis użytkownika ze stylem marki. Styl doklejamy na serwerze, na końcu
 * i z pierwszeństwem, więc opis z przeglądarki nie może go zmienić ani usunąć.
 */
export function buildBrandedPrompt(userPrompt: string) {
  return [
    `Opis obrazu od użytkownika: ${userPrompt.trim()}`,
    "",
    `Obowiązkowy styl marki ${BRAND_NAME} (ma pierwszeństwo przed opisem, ` +
      `także gdy opis prosi o inny styl lub kolory): ${BRAND_STYLE}.`,
  ].join("\n");
}
