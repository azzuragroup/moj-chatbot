import { tool } from "ai";
import { z } from "zod";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 8000;

// Opisy kodów pogody WMO z dokumentacji Open-Meteo.
const WMO: Record<number, string> = {
  0: "bezchmurnie", 1: "przeważnie bezchmurnie", 2: "częściowe zachmurzenie", 3: "pochmurno",
  45: "mgła", 48: "mgła osadzająca szadź",
  51: "lekka mżawka", 53: "umiarkowana mżawka", 55: "gęsta mżawka",
  56: "lekka marznąca mżawka", 57: "gęsta marznąca mżawka",
  61: "słaby deszcz", 63: "umiarkowany deszcz", 65: "silny deszcz",
  66: "słaby marznący deszcz", 67: "silny marznący deszcz",
  71: "słaby śnieg", 73: "umiarkowany śnieg", 75: "intensywny śnieg", 77: "ziarna śniegu",
  80: "słabe przelotne opady deszczu", 81: "umiarkowane przelotne opady deszczu",
  82: "gwałtowne przelotne opady deszczu",
  85: "słabe przelotne opady śniegu", 86: "silne przelotne opady śniegu",
  95: "burza", 96: "burza z drobnym gradem", 97: "silna burza", 99: "burza z dużym gradem",
};

export const describeWeatherCode = (code: number) => WMO[code] ?? `kod pogody ${code}`;

// Sprawdzamy kształt odpowiedzi API, zamiast mu ślepo ufać.
const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

const forecastSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    precipitation: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    precipitation_probability_max: z.array(z.number().nullable()),
  }),
});

export type WeatherResult =
  | {
      miasto: string;
      region?: string;
      kraj?: string;
      teraz: {
        czasPomiaru: string;
        opis: string;
        temperaturaC: number;
        odczuwalnaC: number;
        opadyMm: number;
        wiatrKmh: number;
      };
      prognoza: {
        data: string;
        opis: string;
        tempMaxC: number;
        tempMinC: number;
        szansaOpaduProc: number | null;
      }[];
      zrodlo: string;
      pobrano: string;
    }
  | { blad: string; pobrano: string };

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

async function getJson(url: string, fetchFn: Fetch) {
  const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Pobiera aktualną pogodę i prognozę na 3 dni. Nigdy nie rzuca błędu. */
export async function getWeather(
  city: string,
  fetchFn: Fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<WeatherResult> {
  const stamp = () => now().toISOString();
  try {
    const geoUrl = `${GEOCODING_URL}?${new URLSearchParams({ name: city, count: "1", language: "pl", format: "json" })}`;
    const geo = geocodingSchema.safeParse(await getJson(geoUrl, fetchFn));
    if (!geo.success) {
      return { blad: "Serwis pogody zwrócił nieoczekiwane dane. Spróbuj później.", pobrano: stamp() };
    }
    const place = geo.data.results?.[0];
    if (!place) {
      return { blad: `Nie znaleziono miejscowości „${city}”. Sprawdź pisownię.`, pobrano: stamp() };
    }

    const forecastUrl = `${FORECAST_URL}?${new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "Europe/Warsaw",
      forecast_days: "3",
    })}`;
    const forecast = forecastSchema.safeParse(await getJson(forecastUrl, fetchFn));
    if (!forecast.success) {
      return { blad: "Serwis pogody zwrócił nieoczekiwane dane. Spróbuj później.", pobrano: stamp() };
    }
    const { current, daily } = forecast.data;

    return {
      miasto: place.name,
      region: place.admin1,
      kraj: place.country,
      teraz: {
        czasPomiaru: current.time,
        opis: describeWeatherCode(current.weather_code),
        temperaturaC: current.temperature_2m,
        odczuwalnaC: current.apparent_temperature,
        opadyMm: current.precipitation,
        wiatrKmh: current.wind_speed_10m,
      },
      prognoza: daily.time.map((data, i) => ({
        data,
        opis: describeWeatherCode(daily.weather_code[i]),
        tempMaxC: daily.temperature_2m_max[i],
        tempMinC: daily.temperature_2m_min[i],
        szansaOpaduProc: daily.precipitation_probability_max[i] ?? null,
      })),
      zrodlo: "Open-Meteo (open-meteo.com)",
      pobrano: stamp(),
    };
  } catch {
    return {
      blad: "Serwis pogody nie odpowiada. Spróbuj ponownie za chwilę.",
      pobrano: stamp(),
    };
  }
}

export const pogoda = tool({
  description:
    "Pobiera aktualną pogodę i prognozę na 3 dni (dziś, jutro, pojutrze) dla podanej miejscowości " +
    "z publicznego serwisu Open-Meteo: temperaturę, temperaturę odczuwalną, opady, wiatr i opis pogody. " +
    "Użyj, gdy pytanie dotyczy pogody, temperatury, deszczu, śniegu lub wiatru. " +
    "Jeśli wynik zawiera pole „blad”, przekaż ten komunikat użytkownikowi i nie zgaduj pogody.",
  inputSchema: z.object({
    miasto: z
      .string()
      .min(1)
      .max(100)
      .describe("Nazwa miejscowości, np. „Warszawa” albo „Kraków”."),
  }),
  execute: async ({ miasto }) => getWeather(miasto),
});
