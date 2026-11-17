import { z } from "zod";
import { geocodeCity, getWeather } from "./weather";
import { getCurrency } from "./currency";
import { getHolidays } from "./holidays";
import { getWikipediaSummary } from "./wikipedia";
import { timeIn } from "./tools";
import {
  addDays,
  currencyForCountry,
  differenceFromPoland,
  firstSentences,
  upcomingHolidays,
  warsawToday,
} from "./travelHelpers";

/** Ta sama prognoza co w narzędziu pogoda: od dziś do 15 dni naprzód. */
export const MAX_TRIP_DAYS_AHEAD = 15;

export const travelRequestSchema = z.strictObject({
  miasto: z.string().trim().min(1, "Wpisz miasto.").max(100, "Nazwa miasta jest za długa."),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę w formacie RRRR-MM-DD."),
});

export type CardId = "pogoda" | "waluty" | "swieta" | "wikipedia" | "czas";

export type TravelCard = {
  id: CardId;
  tytul: string;
  zrodlo: string;
  pobrano: string;
} & (
  | { ok: true; wartosc: string; opis?: string; szczegoly?: string[]; link?: { url: string; tekst: string } }
  | { ok: false; blad: string }
);

export type TravelResult =
  | {
      ok: true;
      miejsce: { nazwa: string; region?: string; kraj?: string; kodKraju?: string; strefaCzasowa?: string };
      data: string;
      karty: TravelCard[];
    }
  | { ok: false; blad: string };

const fmtNumber = (n: number, digits = 2) =>
  n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: digits });

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", timeZone: "UTC" });

function failed(id: CardId, tytul: string, zrodlo: string, blad: string, pobrano: string): TravelCard {
  return { id, tytul, zrodlo, pobrano, ok: false, blad };
}

async function weatherCard(city: string, date: string): Promise<TravelCard> {
  const r = await getWeather(city, fetch, () => new Date(), date);
  const zrodlo = "Open-Meteo";
  if ("blad" in r) return failed("pogoda", "Pogoda", zrodlo, r.blad, r.pobrano);
  const day = r.prognoza[0];
  if (!day) return failed("pogoda", "Pogoda", zrodlo, "Brak prognozy na ten dzień.", r.pobrano);
  return {
    id: "pogoda",
    tytul: "Pogoda",
    zrodlo,
    pobrano: r.pobrano,
    ok: true,
    wartosc: `${fmtNumber(day.tempMinC, 1)} °C … ${fmtNumber(day.tempMaxC, 1)} °C`,
    opis: `${fmtDate(day.data)}: ${day.opis}`,
    szczegoly: [day.szansaOpaduProc === null ? "Szansa opadu: brak danych" : `Szansa opadu: ${day.szansaOpaduProc}%`],
  };
}

async function currencyCard(countryCode?: string, country?: string): Promise<TravelCard> {
  const zrodlo = "NBP (kurs średni)";
  const now = new Date().toISOString();
  const code = currencyForCountry(countryCode);
  if (countryCode === "PL") {
    return {
      id: "waluty", tytul: "Waluta", zrodlo, pobrano: now, ok: true,
      wartosc: "PLN", opis: "Na miejscu płacisz złotówkami – przeliczenie niepotrzebne.",
    };
  }
  if (!code) {
    return failed("waluty", "Waluta", zrodlo, `Nie znam waluty kraju ${country ?? countryCode ?? "docelowego"}.`, now);
  }
  const r = await getCurrency(code, 100, "ze_zlotych");
  if ("blad" in r) return failed("waluty", "Waluta", zrodlo, r.blad, r.pobrano);
  return {
    id: "waluty",
    tytul: "Waluta",
    zrodlo,
    pobrano: r.pobrano,
    ok: true,
    wartosc: `1 ${r.kod} = ${fmtNumber(r.kursSredniPLN, 4)} zł`,
    opis: r.przeliczenie ? `100 zł ≈ ${fmtNumber(r.przeliczenie.wynik)} ${r.kod}` : undefined,
    szczegoly: [`${r.waluta}, kurs z dnia ${fmtDate(r.dataKursu)}`],
  };
}

async function holidaysCard(countryCode: string | undefined, date: string): Promise<TravelCard> {
  const zrodlo = "Nager.Date";
  const now = new Date().toISOString();
  if (!countryCode) return failed("swieta", "Święta", zrodlo, "Nie znam kraju tej miejscowości.", now);
  const year = Number(date.slice(0, 4));
  const first = await getHolidays(countryCode, year);
  if ("blad" in first) return failed("swieta", "Święta", zrodlo, first.blad, first.pobrano);
  let list = first.swieta;
  // Pod koniec roku dobieramy święta z następnego roku.
  if (upcomingHolidays(list, date).length < 3) {
    const next = await getHolidays(countryCode, year + 1);
    if (!("blad" in next)) list = [...list, ...next.swieta];
  }
  const upcoming = upcomingHolidays(list, date, 3);
  if (upcoming.length === 0) {
    return failed("swieta", "Święta", zrodlo, "Brak nadchodzących świąt w danych.", first.pobrano);
  }
  const onTripDay = upcoming[0].data === date;
  const daysTo = Math.round((Date.parse(upcoming[0].data) - Date.parse(date)) / 86_400_000);
  return {
    id: "swieta",
    tytul: "Święta",
    zrodlo,
    pobrano: first.pobrano,
    ok: true,
    wartosc: onTripDay ? "W dniu przyjazdu jest święto" : `Najbliższe za ${daysTo} ${daysTo === 1 ? "dzień" : "dni"}`,
    opis: onTripDay ? "Sklepy i urzędy mogą być zamknięte." : undefined,
    szczegoly: upcoming.map((h) => `${fmtDate(h.data)} – ${h.nazwa}${h.wCalymKraju ? "" : " (regionalne)"}`),
  };
}

async function wikipediaCard(city: string): Promise<TravelCard> {
  const zrodlo = "Wikipedia (pl)";
  const r = await getWikipediaSummary(city);
  if ("blad" in r) return failed("wikipedia", "O mieście", zrodlo, r.blad, r.pobrano);
  return {
    id: "wikipedia",
    tytul: "O mieście",
    zrodlo,
    pobrano: r.pobrano,
    ok: true,
    wartosc: r.tytul,
    opis: firstSentences(r.streszczenie, 2),
    link: { url: r.link, tekst: "Czytaj w Wikipedii" },
  };
}

function timeCard(timeZone?: string): TravelCard {
  const zrodlo = "Zegar serwera, strefa z Open-Meteo";
  const r = timeIn(timeZone ?? "Europe/Warsaw");
  if ("blad" in r) return failed("czas", "Czas na miejscu", zrodlo, r.blad, r.pobrano);
  const diff = differenceFromPoland(r.strefaCzasowa);
  return {
    id: "czas",
    tytul: "Czas na miejscu",
    zrodlo,
    pobrano: r.pobrano,
    ok: true,
    wartosc: r.godzina,
    opis: diff.opis,
    szczegoly: [`${r.dzienTygodnia}, ${fmtDate(r.data)} · strefa ${r.strefaCzasowa} (${r.przesuniecieUTC})`],
  };
}

/** Pięć kart podróży z tych samych funkcji, z których korzystają narzędzia agenta. */
export async function buildTravelCards(city: string, date: string): Promise<TravelResult> {
  const today = warsawToday();
  if (date < today) return { ok: false, blad: "Data podróży jest w przeszłości. Wybierz dzisiaj lub późniejszy dzień." };
  if (date > addDays(today, MAX_TRIP_DAYS_AHEAD)) {
    return { ok: false, blad: `Prognoza pogody sięga ${MAX_TRIP_DAYS_AHEAD} dni naprzód. Wybierz bliższą datę.` };
  }
  const geo = await geocodeCity(city);
  if (!geo.ok) return { ok: false, blad: geo.blad };
  const { place } = geo;

  const karty = await Promise.all([
    weatherCard(city, date),
    currencyCard(place.kodKraju, place.kraj),
    holidaysCard(place.kodKraju, date),
    wikipediaCard(place.nazwa),
    Promise.resolve(timeCard(place.strefaCzasowa)),
  ]);
  return { ok: true, miejsce: place, data: date, karty };
}

// ---------- Podsumowanie od agenta ----------

const cardForSummary = z.object({
  tytul: z.string().max(40),
  ok: z.boolean(),
  wartosc: z.string().max(200).optional(),
  opis: z.string().max(600).optional(),
  szczegoly: z.array(z.string().max(200)).max(5).optional(),
  blad: z.string().max(300).optional(),
});

export const summaryRequestSchema = z.strictObject({
  miasto: z.string().trim().min(1).max(100),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  karty: z.array(cardForSummary).min(1).max(5),
});

/** Dane z kart jako zwarty tekst dla modelu (bez linków i godzin pobrania). */
export function cardsToPrompt({ miasto, data, karty }: z.infer<typeof summaryRequestSchema>) {
  const lines = karty.map((k) =>
    k.ok
      ? `- ${k.tytul}: ${[k.wartosc, k.opis, ...(k.szczegoly ?? [])].filter(Boolean).join("; ")}`
      : `- ${k.tytul}: nie udało się sprawdzić (${k.blad ?? "błąd źródła"})`,
  );
  return `Podróż: ${miasto}, dzień ${data}.\n<dane>\n${lines.join("\n")}\n</dane>`;
}
