import { z } from "zod";
import { getHolidays } from "./holidays";
import { PRODUKTY, type Produkt } from "./catalogData";
import { nextProduct, planMonth, productRotation, type MonthPlan } from "./plannerCore";

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Wybierz miesiąc (RRRR-MM).")
  .refine((m) => {
    const y = Number(m.slice(0, 4));
    return y >= 2024 && y <= 2035;
  }, "Wybierz miesiąc z lat 2024–2035.");

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/, "Nieznany produkt. Odśwież plan.");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const plannerRequestSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("plan"), miesiac: monthSchema }),
  z.strictObject({
    mode: z.literal("produkt"),
    miesiac: monthSchema,
    obecny: slugSchema,
    wyklucz: z.array(slugSchema).max(40),
  }),
  z.strictObject({
    mode: z.literal("tydzien"),
    posty: z.array(z.strictObject({ data: dateSchema, slug: slugSchema })).min(1).max(5),
  }),
]);

export type ProductCard = { slug: string; nazwa: string; marka: string; link: string };

export const productCard = (p: Produkt): ProductCard => ({ slug: p.slug, nazwa: p.nazwa, marka: p.marka, link: p.link });
export const findProduct = (slug: string) => PRODUKTY.find((p) => p.slug === slug);
const ALL_SLUGS = PRODUKTY.map((p) => p.slug);

export const SOURCES = {
  swieta: "Nager.Date (date.nager.at)",
  katalog: "Katalog produktów Azzura Group (azzuragroup.com)",
};

export type PlannerPlan = MonthPlan & {
  swietaBlad?: string;
  produkty: Record<string, ProductCard>; // data → produkt
  zrodla: string[];
  przygotowano: string;
};

/** Plan miesiąca bez modelu: dni, święta (Nager.Date) i produkty z katalogu (bez powtórek). */
export async function buildPlannerPlan(month: string): Promise<PlannerPlan> {
  const year = Number(month.slice(0, 4));
  const holidays = await getHolidays("PL", year);
  const holidayList = "blad" in holidays ? null : holidays.swieta.map((h) => ({ data: h.data, nazwa: h.nazwa }));
  const plan = planMonth(month, holidayList);

  const order = productRotation(ALL_SLUGS, month);
  const produkty: Record<string, ProductCard> = {};
  let i = 0;
  for (const week of plan.tygodnie) {
    for (const post of week.posty) {
      const p = findProduct(order[i % order.length]);
      if (p) produkty[post.data] = productCard(p);
      i++;
    }
  }
  return {
    ...plan,
    ...("blad" in holidays ? { swietaBlad: holidays.blad } : {}),
    produkty,
    zrodla: [SOURCES.swieta, SOURCES.katalog],
    przygotowano: new Date().toISOString(),
  };
}

/** „Inny produkt”: kolejny z rotacji, którego nie ma jeszcze w planie miesiąca. */
export function otherProduct(month: string, current: string, exclude: string[]) {
  const slug = nextProduct(ALL_SLUGS, month, current, exclude);
  const p = slug ? findProduct(slug) : undefined;
  return p ? productCard(p) : null;
}

/** Fakty o produkcie dla modelu – tylko z katalogu. */
export function productFacts(p: Produkt) {
  return {
    nazwa: p.nazwa,
    marka: p.marka,
    link: p.link,
    opis: p.opis,
    zastosowania: p.zastosowania,
    cechy: p.cechy,
    formaty: p.formaty,
    grubosci: p.grubosci,
    parametry: p.parametry,
  };
}
