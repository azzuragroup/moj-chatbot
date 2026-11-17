import { tool } from "ai";
import { z } from "zod";

const WL_URL = "https://wl-api.mf.gov.pl/api/search/nip";
const KRS_URL = "https://api-krs.ms.gov.pl/api/krs/OdpisAktualny";
const TIMEOUT_MS = 10_000;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

// ---------- Walidacja numerów ----------

/** Zostawia same cyfry z NIP-u (usuwa spacje, myślniki i przedrostek PL). */
export function normalizeNip(input: string) {
  return input.replace(/^\s*PL/i, "").replace(/[\s-]/g, "");
}

/** Sprawdza NIP: 10 cyfr i poprawna cyfra kontrolna. */
export function isValidNip(nip: string) {
  if (!/^\d{10}$/.test(nip)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((s, w, i) => s + w * Number(nip[i]), 0);
  const control = sum % 11;
  return control !== 10 && control === Number(nip[9]);
}

/** Numer KRS: do 10 cyfr, uzupełniany zerami z przodu. */
export function normalizeKrs(input: string) {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{1,10}$/.test(digits) ? digits.padStart(10, "0") : null;
}

// ---------- Biała lista VAT (Ministerstwo Finansów) ----------

// Pola z dokumentacji wl-api.mf.gov.pl. Bierzemy tylko potrzebne – bez PESEL i osób.
const wlSchema = z.object({
  result: z.object({
    subject: z
      .object({
        name: z.string(),
        nip: z.string().nullable().optional(),
        statusVat: z.string().nullable().optional(),
        regon: z.string().nullable().optional(),
        krs: z.string().nullable().optional(),
        workingAddress: z.string().nullable().optional(),
        residenceAddress: z.string().nullable().optional(),
        registrationLegalDate: z.string().nullable().optional(),
        registrationDenialDate: z.string().nullable().optional(),
        registrationDenialBasis: z.string().nullable().optional(),
        restorationDate: z.string().nullable().optional(),
        removalDate: z.string().nullable().optional(),
        removalBasis: z.string().nullable().optional(),
        accountNumbers: z.array(z.string()).nullable().optional(),
      })
      .nullable(),
    requestDateTime: z.string().optional(),
  }),
});
const wlErrorSchema = z.object({ code: z.string().optional(), message: z.string().optional() });

type WlSubject = NonNullable<z.infer<typeof wlSchema>["result"]["subject"]>;
type Lookup<T> = { ok: true; data: T } | { ok: false; blad: string; brak?: boolean };

async function lookupWhiteList(nip: string, today: string, fetchFn: Fetch): Promise<Lookup<WlSubject>> {
  try {
    const res = await fetchFn(`${WL_URL}/${nip}?date=${today}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429) {
      return { ok: false, blad: "Wyczerpano dzienny limit zapytań do Białej listy VAT. Spróbuj jutro." };
    }
    if (res.status === 400) {
      const err = wlErrorSchema.safeParse(await res.json().catch(() => ({})));
      const detail = err.success && err.data.message ? `: ${err.data.message.slice(0, 160)}` : "";
      return { ok: false, blad: `Biała lista VAT odrzuciła zapytanie${detail}.` };
    }
    if (!res.ok) return { ok: false, blad: "Źródło nie odpowiada (Biała lista VAT)." };
    const parsed = wlSchema.safeParse(await res.json());
    if (!parsed.success) return { ok: false, blad: "Biała lista VAT zwróciła nieoczekiwane dane." };
    const subject = parsed.data.result.subject;
    if (!subject) {
      return { ok: false, brak: true, blad: `NIP ${nip} nie figuruje na Białej liście podatników VAT.` };
    }
    return { ok: true, data: subject };
  } catch {
    return { ok: false, blad: "Źródło nie odpowiada (Biała lista VAT)." };
  }
}

// ---------- KRS (Ministerstwo Sprawiedliwości) ----------

const krsSchema = z.object({
  odpis: z.object({
    naglowekA: z.object({
      numerKRS: z.string(),
      stanZDnia: z.string().optional(),
      dataRejestracjiWKRS: z.string().optional(),
      dataOstatniegoWpisu: z.string().optional(),
    }),
    dane: z.object({
      dzial1: z.object({
        danePodmiotu: z.object({
          nazwa: z.string(),
          formaPrawna: z.string().optional(),
          identyfikatory: z.object({ nip: z.string().optional(), regon: z.string().optional() }).optional(),
        }),
        siedzibaIAdres: z
          .object({
            adres: z
              .object({
                ulica: z.string().optional(),
                nrDomu: z.string().optional(),
                nrLokalu: z.string().optional(),
                kodPocztowy: z.string().optional(),
                miejscowosc: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        kapital: z
          .object({
            wysokoscKapitaluZakladowego: z.object({ wartosc: z.string(), waluta: z.string() }).optional(),
          })
          .optional(),
      }),
      dzial2: z
        .object({
          reprezentacja: z
            .object({
              nazwaOrganu: z.string().optional(),
              sklad: z.array(z.object({ funkcjaWOrganie: z.string().optional() })).optional(),
            })
            .optional(),
        })
        .optional(),
      dzial6: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
});
type KrsOdpis = z.infer<typeof krsSchema>["odpis"];

async function lookupKrs(krs: string, fetchFn: Fetch): Promise<Lookup<KrsOdpis>> {
  try {
    // P – rejestr przedsiębiorców, S – stowarzyszeń i fundacji.
    for (const rejestr of ["P", "S"]) {
      const res = await fetchFn(`${KRS_URL}/${krs}?rejestr=${rejestr}&format=json`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 404 || res.status === 204) continue;
      if (!res.ok) return { ok: false, blad: "Źródło nie odpowiada (KRS)." };
      const parsed = krsSchema.safeParse(await res.json());
      if (!parsed.success) return { ok: false, blad: "Rejestr KRS zwrócił nieoczekiwane dane." };
      return { ok: true, data: parsed.data.odpis };
    }
    return {
      ok: false,
      brak: true,
      blad: `W KRS nie ma aktualnego wpisu dla numeru ${krs} (podmiot nie istnieje albo został wykreślony).`,
    };
  } catch {
    return { ok: false, blad: "Źródło nie odpowiada (KRS)." };
  }
}

// ---------- Złożenie wyniku ----------

/** „19.07.2001” → „2001-07-19”. */
function isoFromPl(date?: string) {
  const m = date?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

function fullYearsBetween(fromIso: string, to: Date) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const beforeAnniversary =
    to.getUTCMonth() < from.getUTCMonth() ||
    (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

const DZIAL6_LABELS: [RegExp, string][] = [
  [/likwid/i, "likwidacja"],
  [/upad/i, "postępowanie upadłościowe"],
  [/restruktur|sanac|uklad/i, "postępowanie restrukturyzacyjne"],
  [/rozwiaz|uniewaz/i, "rozwiązanie lub unieważnienie spółki"],
  [/zawiesz/i, "zawieszenie działalności"],
  [/kurator/i, "ustanowiony kurator"],
  [/polacz|podzial|przeksztal/i, "połączenie, podział lub przekształcenie"],
];

const NAME_FLAGS: [RegExp, string][] = [
  [/W LIKWIDACJI/i, "w nazwie: „w likwidacji”"],
  [/W UPADŁOŚCI/i, "w nazwie: „w upadłości”"],
  [/W RESTRUKTURYZACJI/i, "w nazwie: „w restrukturyzacji”"],
];

function nonEmpty(v: unknown) {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
}

export type CompanyResult =
  | {
      nazwa: string;
      nip?: string;
      regon?: string;
      krs?: string;
      bialaListaVat:
        | {
            statusVat: string;
            zarejestrowanyOd?: string;
            wykreslony?: { data: string; podstawa?: string };
            odmowaRejestracji?: { data: string; podstawa?: string };
            przywrocony?: string;
            liczbaZgloszonychKontBankowych: number;
            adres?: string;
          }
        | { blad: string };
      krsDane?:
        | {
            formaPrawna?: string;
            wpisDoKrs?: string;
            latWRejestrze?: number;
            ostatniWpis?: string;
            kapitalZakladowy?: string;
            adres?: string;
            organReprezentacji?: string;
            funkcjeWZarzadzie?: string[];
          }
        | { blad: string };
      sygnalyOstrzegawcze: string[];
      sygnalyPozytywne: string[];
      inneInformacje: string[];
      uwaga: string;
      zrodla: string[];
      pobrano: string;
    }
  | { blad: string; pobrano: string };

/**
 * Zbiera z rejestrów państwowych fakty o firmie (po NIP albo KRS).
 * Nie ocenia firmy – podaje sygnały. Nigdy nie rzuca błędu.
 */
export async function checkCompany(
  { nip, krs }: { nip?: string; krs?: string },
  fetchFn: Fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<CompanyResult> {
  const date = now();
  const pobrano = date.toISOString();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  let nipNo = nip ? normalizeNip(nip) : undefined;
  let krsNo = krs ? normalizeKrs(krs) ?? undefined : undefined;
  if (!nipNo && !krsNo) {
    return { blad: krs ? `„${krs}” to nie jest numer KRS (do 10 cyfr).` : "Podaj NIP albo numer KRS firmy.", pobrano };
  }
  if (nipNo && !isValidNip(nipNo)) {
    return { blad: `NIP „${nip}” jest niepoprawny (10 cyfr z poprawną cyfrą kontrolną).`, pobrano };
  }

  // Kolejność: znany NIP → Biała lista (podaje też KRS); znany tylko KRS → KRS (podaje NIP).
  let wl: Lookup<WlSubject> | undefined;
  let krsResult: Lookup<KrsOdpis> | undefined;
  if (nipNo) {
    wl = await lookupWhiteList(nipNo, today, fetchFn);
    if (!krsNo && wl.ok && wl.data.krs) krsNo = normalizeKrs(wl.data.krs) ?? undefined;
    if (krsNo) krsResult = await lookupKrs(krsNo, fetchFn);
  } else if (krsNo) {
    krsResult = await lookupKrs(krsNo, fetchFn);
    const foundNip = krsResult.ok ? krsResult.data.dane.dzial1.danePodmiotu.identyfikatory?.nip : undefined;
    if (foundNip && isValidNip(foundNip)) {
      nipNo = foundNip;
      wl = await lookupWhiteList(foundNip, today, fetchFn);
    }
  }

  const wlOk = wl?.ok ? wl.data : undefined;
  const krsOk = krsResult?.ok ? krsResult.data : undefined;
  if (!wlOk && !krsOk) {
    const messages = [wl, krsResult].filter((r): r is { ok: false; blad: string } => !!r && !r.ok).map((r) => r.blad);
    return { blad: messages.join(" ") || "Nie znaleziono firmy w rejestrach.", pobrano };
  }

  const ostrzezenia: string[] = [];
  const pozytywne: string[] = [];
  const inne: string[] = [];

  let bialaListaVat: Extract<CompanyResult, { nazwa: string }>["bialaListaVat"];
  if (wlOk) {
    const accounts = wlOk.accountNumbers?.length ?? 0;
    const status = wlOk.statusVat ?? "brak danych";
    bialaListaVat = {
      statusVat: status,
      ...(wlOk.registrationLegalDate ? { zarejestrowanyOd: wlOk.registrationLegalDate } : {}),
      ...(wlOk.removalDate ? { wykreslony: { data: wlOk.removalDate, podstawa: wlOk.removalBasis ?? undefined } } : {}),
      ...(wlOk.registrationDenialDate
        ? { odmowaRejestracji: { data: wlOk.registrationDenialDate, podstawa: wlOk.registrationDenialBasis ?? undefined } }
        : {}),
      ...(wlOk.restorationDate ? { przywrocony: wlOk.restorationDate } : {}),
      liczbaZgloszonychKontBankowych: accounts,
      ...(wlOk.workingAddress || wlOk.residenceAddress
        ? { adres: (wlOk.workingAddress ?? wlOk.residenceAddress)! }
        : {}),
    };
    if (status === "Czynny") pozytywne.push("czynny podatnik VAT");
    else ostrzezenia.push(`status VAT: ${status}`);
    if (wlOk.removalDate) ostrzezenia.push(`wykreślony z rejestru VAT ${wlOk.removalDate}`);
    if (wlOk.registrationDenialDate) ostrzezenia.push(`odmowa rejestracji VAT ${wlOk.registrationDenialDate}`);
    if (accounts === 0) ostrzezenia.push("brak zgłoszonych kont bankowych na Białej liście");
    else pozytywne.push(`zgłoszone konta bankowe: ${accounts}`);
  } else {
    bialaListaVat = { blad: wl && !wl.ok ? wl.blad : "Brak NIP-u – nie sprawdzono Białej listy VAT." };
    if (wl && !wl.ok && wl.brak) ostrzezenia.push("brak firmy na Białej liście VAT");
  }

  let krsDane: Extract<CompanyResult, { nazwa: string }>["krsDane"];
  if (krsOk) {
    const d1 = krsOk.dane.dzial1;
    const wpis = isoFromPl(krsOk.naglowekA.dataRejestracjiWKRS);
    const lat = wpis ? fullYearsBetween(wpis, date) : undefined;
    const a = d1.siedzibaIAdres?.adres;
    const kap = d1.kapital?.wysokoscKapitaluZakladowego;
    const rep = krsOk.dane.dzial2?.reprezentacja;
    krsDane = {
      formaPrawna: d1.danePodmiotu.formaPrawna,
      wpisDoKrs: wpis,
      latWRejestrze: lat,
      ostatniWpis: isoFromPl(krsOk.naglowekA.dataOstatniegoWpisu),
      ...(kap ? { kapitalZakladowy: `${kap.wartosc} ${kap.waluta}` } : {}),
      ...(a
        ? {
            adres: [
              [a.ulica, [a.nrDomu, a.nrLokalu].filter(Boolean).join("/")].filter(Boolean).join(" "),
              [a.kodPocztowy, a.miejscowosc].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", "),
          }
        : {}),
      ...(rep?.nazwaOrganu ? { organReprezentacji: rep.nazwaOrganu } : {}),
      // Tylko funkcje – bez imion, nazwisk i PESEL-i.
      ...(rep?.sklad?.length
        ? { funkcjeWZarzadzie: rep.sklad.map((s) => s.funkcjaWOrganie ?? "członek").slice(0, 10) }
        : {}),
    };
    if (lat !== undefined) pozytywne.push(`w KRS od ${lat} ${lat === 1 ? "roku" : "lat"} (od ${wpis})`);
    for (const [key, value] of Object.entries(krsOk.dane.dzial6 ?? {})) {
      if (!nonEmpty(value)) continue;
      const label = DZIAL6_LABELS.find(([re]) => re.test(key))?.[1] ?? key;
      // Połączenie lub przekształcenie to historia firmy, nie sygnał ostrzegawczy.
      (label.startsWith("połączenie") ? inne : ostrzezenia).push(`KRS, dział 6: ${label}`);
    }
    for (const [re, label] of NAME_FLAGS) if (re.test(d1.danePodmiotu.nazwa)) ostrzezenia.push(label);
  } else if (krsResult && !krsResult.ok) {
    krsDane = { blad: krsResult.blad };
  }

  const nazwa = wlOk?.name ?? krsOk!.dane.dzial1.danePodmiotu.nazwa;
  const regon = wlOk?.regon ?? krsOk?.dane.dzial1.danePodmiotu.identyfikatory?.regon ?? undefined;
  return {
    nazwa,
    ...(nipNo ? { nip: nipNo } : {}),
    ...(regon ? { regon } : {}),
    ...(krsNo ? { krs: krsNo } : {}),
    bialaListaVat,
    ...(krsDane
      ? { krsDane }
      : { krsDane: { blad: "Brak numeru KRS (np. jednoosobowa działalność z CEIDG albo urząd) – sprawdzono tylko Białą listę VAT." } }),
    sygnalyOstrzegawcze: ostrzezenia,
    sygnalyPozytywne: pozytywne,
    inneInformacje: inne,
    uwaga:
      "To fakty z rejestrów państwowych, nie ocena rzetelności ani opinie klientów. " +
      "Decyzję o współpracy podejmuje pracownik.",
    zrodla: [
      "Biała lista podatników VAT, Ministerstwo Finansów (wl-api.mf.gov.pl)",
      "Krajowy Rejestr Sądowy, Ministerstwo Sprawiedliwości (api-krs.ms.gov.pl)",
    ],
    pobrano,
  };
}

export const sprawdzFirme = tool({
  description:
    "Sprawdza polską firmę w rejestrach państwowych po numerze NIP albo KRS: nazwę, status VAT, " +
    "wykreślenia i odmowy rejestracji VAT, liczbę zgłoszonych kont bankowych (Biała lista VAT " +
    "Ministerstwa Finansów) oraz formę prawną, wiek firmy, kapitał, zarząd i informacje o likwidacji, " +
    "upadłości czy przekształceniu (KRS). Użyj, gdy użytkownik pyta, czy firma jest wiarygodna, " +
    "rzetelna, aktywna, albo prosi o sprawdzenie kontrahenta lub klienta przed ofertą. " +
    "Nie wydawaj werdyktu „rzetelna/nierzetelna” – przedstaw sygnały i dopisz, że decyzję podejmuje " +
    "pracownik. Narzędzie nie ma opinii klientów. Jeśli wynik zawiera „blad”, przekaż komunikat.",
  inputSchema: z
    .object({
      nip: z
        .string()
        .trim()
        .regex(/^(PL)?[\d\s-]{10,13}$/i, "NIP: 10 cyfr, mogą być spacje lub myślniki")
        .optional()
        .describe("NIP firmy, np. „526-025-02-74” albo „5260250274”."),
      krs: z
        .string()
        .trim()
        .regex(/^[\d\s-]{1,12}$/, "KRS: do 10 cyfr")
        .optional()
        .describe("Numer KRS, np. „0000028860”. Podaj, gdy nie znasz NIP-u."),
    })
    .refine((v) => v.nip || v.krs, { message: "Podaj NIP albo numer KRS." }),
  execute: async ({ nip, krs }) => checkCompany({ nip, krs }),
});
