import { tool } from "ai";
import { z } from "zod";
import { MARKI, szukajProduktow, type Produkt } from "./catalogData";

export type KatalogWynik = {
  znaleziono: number;
  produkty: Produkt[];
  komunikat?: string;
};

/** Katalog produktów Azzura Group (dane ze stron azzuragroup.com, bez cen). */
export const katalogProduktow = tool({
  description:
    "Zwraca dane produktów Azzura Group z katalogu na azzuragroup.com: nazwę, markę, krótki opis, " +
    "formaty, grubości, zastosowania, cechy do komunikacji marketingowej i link do strony produktu. " +
    "Użyj, gdy pytanie, opis, mail lub post dotyczy konkretnego produktu albo marki " +
    "(np. BoardeX, Fibrex, Dragonwood, Tromer), jego parametrów, cech lub zastosowań, " +
    "gdy trzeba dobrać produkt do zastosowania (np. elewacja, sufit akustyczny) " +
    "albo gdy trzeba podać link do produktu. Katalog nie zawiera cen.",
  inputSchema: z.object({
    zapytanie: z
      .string()
      .min(2)
      .max(200)
      .describe("Nazwa produktu, marka albo zastosowanie, np. „BoardeX” lub „panele akustyczne do biura”."),
  }),
  execute: async ({ zapytanie }): Promise<KatalogWynik> => {
    const produkty = szukajProduktow(zapytanie);
    if (produkty.length === 0) {
      return {
        znaleziono: 0,
        produkty: [],
        komunikat: `Nie znaleziono produktu w katalogu. Marki w katalogu: ${MARKI.join(", ")}.`,
      };
    }
    return { znaleziono: produkty.length, produkty };
  },
});
