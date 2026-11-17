/**
 * Czyste funkcje pomocnicze asystenta podróży (bez sieci, bez importów lokalnych).
 */

/** Waluta kraju (ISO 3166 → ISO 4217). Kursy podaje NBP (tabela A lub B). */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  // strefa euro i kraje używające euro
  AT: "EUR", BE: "EUR", BG: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR",
  FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR", LV: "EUR",
  MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR", AD: "EUR", MC: "EUR", SM: "EUR",
  VA: "EUR", ME: "EUR", XK: "EUR",
  // reszta Europy
  PL: "PLN", CZ: "CZK", HU: "HUF", GB: "GBP", CH: "CHF", LI: "CHF", NO: "NOK", SE: "SEK",
  DK: "DKK", IS: "ISK", RO: "RON", RS: "RSD", BA: "BAM", MK: "MKD", AL: "ALL", MD: "MDL",
  UA: "UAH", TR: "TRY", GE: "GEL", AM: "AMD",
  // świat
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", AU: "AUD", NZ: "NZD",
  JP: "JPY", CN: "CNY", KR: "KRW", IN: "INR", TH: "THB", VN: "VND", ID: "IDR", MY: "MYR",
  SG: "SGD", PH: "PHP", HK: "HKD", AE: "AED", SA: "SAR", QA: "QAR", IL: "ILS", EG: "EGP",
  MA: "MAD", TN: "TND", ZA: "ZAR", KZ: "KZT",
};

export function currencyForCountry(countryCode?: string): string | undefined {
  return countryCode ? CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] : undefined;
}

/** Przesunięcie strefy względem UTC w minutach, np. Europe/Prague zimą → 60. */
export function utcOffsetMinutes(timeZone: string, at: Date = new Date()) {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === "-" ? -minutes : minutes;
}

/** Różnica czasu względem Polski, np. „+1 h”, „−6 h”, „+4 h 30 min”, „tak samo jak w Polsce”. */
export function differenceFromPoland(timeZone: string, at: Date = new Date()) {
  const diff = utcOffsetMinutes(timeZone, at) - utcOffsetMinutes("Europe/Warsaw", at);
  if (diff === 0) return { minuty: 0, opis: "tak samo jak w Polsce" };
  const sign = diff > 0 ? "+" : "−";
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  const text = `${sign}${h} h${min ? ` ${min} min` : ""}`;
  return { minuty: diff, opis: `${text} względem Polski` };
}

/** Pierwsze zdania tekstu (domyślnie dwa). */
export function firstSentences(text: string, count = 2) {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9„"])/);
  return sentences.slice(0, count).join(" ");
}

type Holiday = { data: string; nazwa: string; wCalymKraju?: boolean };

/** Najbliższe święta od podanej daty (włącznie), posortowane, bez powtórzeń dat. */
export function upcomingHolidays<T extends Holiday>(list: T[], fromDate: string, count = 3): T[] {
  const seen = new Set<string>();
  return [...list]
    .filter((h) => h.data >= fromDate)
    .sort((a, b) => a.data.localeCompare(b.data))
    .filter((h) => (seen.has(h.data) ? false : (seen.add(h.data), true)))
    .slice(0, count);
}

/** Data w Polsce w formacie RRRR-MM-DD. */
export function warsawToday(at: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Dodaje dni do daty RRRR-MM-DD. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Czy tekst kończy się pełnym zdaniem (kropka, ! ? … ewentualnie z cudzysłowem). */
export function endsWithSentence(text: string) {
  return /[.!?…]["”»)]?$/.test(text.trim());
}

/**
 * Tylko pełne zdania (najwyżej `max`). Urwane ostatnie zdanie jest odrzucane,
 * więc użytkownik nigdy nie zobaczy tekstu w rodzaju „warto spakować”.
 */
export function completeSentences(text: string, max = 3) {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…]["”»)]?)\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9„"])/)
    .filter(Boolean);
  if (sentences.length > 0 && !endsWithSentence(sentences[sentences.length - 1])) sentences.pop();
  return sentences.slice(0, max).join(" ");
}
