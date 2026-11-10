import { tool } from "ai";
import { z } from "zod";

const TIME_ZONE = "Europe/Warsaw";

/** Data, dzień tygodnia i godzina w strefie Europe/Warsaw. */
export function currentWarsawTime(now: Date = new Date()) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pl-PL", { timeZone: TIME_ZONE, ...options }).format(now);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return {
    data: date,
    dzienTygodnia: part({ weekday: "long" }),
    godzina: part({ hour: "2-digit", minute: "2-digit", hour12: false }),
    strefaCzasowa: TIME_ZONE,
  };
}

export const aktualnyCzas = tool({
  description:
    "Zwraca dzisiejszą datę (RRRR-MM-DD), dzień tygodnia i godzinę w Polsce (strefa Europe/Warsaw). " +
    "Użyj zawsze, gdy odpowiedź zależy od bieżącej daty lub godziny: pytania o „dziś”, „jutro”, " +
    "„wczoraj”, „teraz”, „za ile dni”, „ile zostało do”, dzień tygodnia albo termin liczony od dzisiaj. " +
    "Nie zgaduj daty z pamięci.",
  inputSchema: z.object({}),
  execute: async () => currentWarsawTime(),
});
