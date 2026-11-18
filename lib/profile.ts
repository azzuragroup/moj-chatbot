import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getSupabase } from "./supabase";
import {
  MAX_KEY,
  MAX_NAME,
  MAX_VALUE,
  mergePreferences,
  sanitizeFacts,
  sanitizeName,
  type Preferences,
} from "./profileCore";

/**
 * Profil użytkownika w tabeli user_profiles. Do lekcji 7 aplikacja ma jednego
 * właściciela, więc profil to jeden wiersz (najstarszy) – zapis go aktualizuje.
 */

export type Profile = { id: number; name: string | null; preferences: Preferences };

export async function loadProfile(): Promise<Profile | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("user_profiles")
    .select("id, name, preferences")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[baza] nie udało się wczytać profilu", error.code, error.message);
    return null;
  }
  if (!data) return null;
  return { id: data.id as number, name: (data.name as string | null) ?? null, preferences: mergePreferences(data.preferences, {}) };
}

/** Aktualizuje jedyny wiersz profilu (albo tworzy go, gdy go jeszcze nie ma). */
export async function saveProfile(update: { name?: string; preferences: Preferences }) {
  const db = getSupabase();
  if (!db) return { ok: false as const, blad: "Pamięć o użytkowniku jest wyłączona – brak konfiguracji bazy." };
  const current = await loadProfile();
  const preferences = mergePreferences(current?.preferences ?? {}, update.preferences);
  const row = { ...(update.name ? { name: update.name } : {}), preferences };
  const { error } = current
    ? await db.from("user_profiles").update(row).eq("id", current.id)
    : await db.from("user_profiles").insert(row);
  if (error) {
    console.error("[baza] nie udało się zapisać profilu", error.code, error.message);
    return { ok: false as const, blad: "Nie udało się zapisać profilu w bazie." };
  }
  return { ok: true as const, name: update.name ?? current?.name ?? null, preferences };
}

export const zapiszProfil = tool({
  description:
    "Zapisuje w pamięci (profil w bazie) fakty, które użytkownik wprost mówi o sobie: imię oraz np. " +
    "miasto, stanowisko, styl lub długość odpowiedzi, a przede wszystkim preferencje marketingowe: " +
    "kanały (np. LinkedIn, Instagram), ton komunikacji i główne marki (np. BoardeX, Dragonwood). Użyj TYLKO, gdy użytkownik mówi o sobie wprost („mam na imię…”, " +
    "„pracuję w…”, „wolę krótkie odpowiedzi”). Nie zapisuj domysłów, planów („może kiedyś”), żartów, " +
    "informacji o innych osobach ani treści maili i wiadomości klientów. Nigdy nie zapisuj haseł, " +
    "kluczy, numerów kont, kart, PESEL ani danych wrażliwych (zdrowie, poglądy, wyznanie). " +
    "Nowy fakt nie kasuje starych. Po zapisie krótko potwierdź, co zapamiętałeś.",
  inputSchema: z.object({
    imie: z.string().trim().min(1).max(MAX_NAME).optional().describe("Imię użytkownika, jeśli je podał."),
    kanaly: z.string().trim().min(1).max(MAX_VALUE).optional().describe("Kanały, w których publikuje, np. „LinkedIn, Instagram”."),
    ton: z.string().trim().min(1).max(MAX_VALUE).optional().describe("Ton komunikacji, np. „rzeczowy, z umiarem w emotkach”."),
    marki: z.string().trim().min(1).max(MAX_VALUE).optional().describe("Główne marki, którymi się zajmuje, np. „BoardeX, Dragonwood”."),
    fakty: z
      .array(
        z.object({
          nazwa: z.string().trim().min(1).max(MAX_KEY).describe("Krótka nazwa faktu, np. „miasto”, „styl odpowiedzi”."),
          wartosc: z.string().trim().min(1).max(MAX_VALUE).describe("Wartość, np. „Rzeszów”, „krótko i rzeczowo”."),
        }),
      )
      .max(10)
      .default([])
      .describe("Pozostałe fakty o użytkowniku jako pary nazwa–wartość."),
  }),
  execute: async ({ imie, kanaly, ton, marki, fakty }) => {
    const pobrano = new Date().toISOString();
    const name = sanitizeName(imie);
    const { accepted, rejected } = sanitizeFacts([
      ...(kanaly ? [{ nazwa: "kanały", wartosc: kanaly }] : []),
      ...(ton ? [{ nazwa: "ton_komunikacji", wartosc: ton }] : []),
      ...(marki ? [{ nazwa: "główne_marki", wartosc: marki }] : []),
      ...fakty,
    ]);
    if (!name && Object.keys(accepted).length === 0) {
      return {
        blad: rejected.length
          ? "Nie zapisano: te informacje są wrażliwe (np. hasła, numery, dane o zdrowiu) i nie trafiają do pamięci."
          : "Nie było nic do zapisania.",
        odrzucone: rejected,
        pobrano,
      };
    }
    const result = await saveProfile({ name, preferences: accepted });
    if (!result.ok) return { blad: result.blad, pobrano };
    return {
      zapamietano: { ...(name ? { imie: name } : {}), ...accepted },
      ...(rejected.length ? { odrzucone: rejected, uwaga: "Pominięto dane wrażliwe." } : {}),
      liczbaFaktowWProfilu: Object.keys(result.preferences).length,
      pobrano,
    };
  },
});

/**
 * Zapis z formularza /profile: zastępuje imię i preferencje w tym samym wierszu
 * (to, co użytkownik usunął, znika). Dane wrażliwe są odrzucane jak przy narzędziu.
 */
export async function replaceProfile(input: { name: string | null; preferences: Record<string, string> }) {
  const db = getSupabase();
  if (!db) return { ok: false as const, blad: "Profil jest wyłączony – brak konfiguracji bazy." };
  const name = input.name === null ? null : sanitizeName(input.name) ?? null;
  const { accepted, rejected } = sanitizeFacts(
    Object.entries(input.preferences).map(([nazwa, wartosc]) => ({ nazwa, wartosc })),
  );
  const preferences = mergePreferences({}, accepted);
  const current = await loadProfile();
  const row = { name, preferences };
  const { error } = current
    ? await db.from("user_profiles").update(row).eq("id", current.id)
    : await db.from("user_profiles").insert(row);
  if (error) {
    console.error("[baza] nie udało się zapisać profilu", error.code, error.message);
    return { ok: false as const, blad: "Nie udało się zapisać profilu w bazie." };
  }
  return { ok: true as const, profile: { name, preferences }, rejected };
}
