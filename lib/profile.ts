import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { UserDb } from "./supabase/server";
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
 * Profil zalogowanej osoby w tabeli user_profiles: jeden wiersz na użytkownika
 * (unikalny user_id). Wszystko idzie klientem zalogowanej osoby (getUserDb),
 * więc RLS pokazuje i zmienia tylko jej własny wiersz. user_id wypełnia baza
 * (domyślnie auth.uid()) – nie podajemy go ani z przeglądarki, ani od modelu.
 */

export type Profile = { id: number; name: string | null; preferences: Preferences };

export async function loadProfile(db: UserDb | null): Promise<Profile | null> {
  if (!db) return null;
  // RLS zwraca wyłącznie wiersz zalogowanej osoby (najwyżej jeden – user_id jest unikalny).
  const { data, error } = await db.from("user_profiles").select("id, name, preferences").maybeSingle();
  if (error) {
    console.error("[baza] nie udało się wczytać profilu", error.code, error.message);
    return null;
  }
  if (!data) return null;
  return { id: data.id as number, name: (data.name as string | null) ?? null, preferences: mergePreferences(data.preferences, {}) };
}

/**
 * Zapis wiersza profilu: aktualizacja istniejącego albo utworzenie nowego.
 * Gdy dwa zapisy naraz próbują utworzyć profil, drugi trafi na unikalny user_id (23505) –
 * wtedy wczytujemy wiersz jeszcze raz i go aktualizujemy.
 */
async function writeProfileRow(db: UserDb, current: Profile | null, row: { name?: string | null; preferences: Preferences }) {
  if (current) return db.from("user_profiles").update(row).eq("id", current.id);
  const inserted = await db.from("user_profiles").insert(row);
  if (inserted.error?.code !== "23505") return inserted;
  const again = await loadProfile(db);
  return again ? db.from("user_profiles").update(row).eq("id", again.id) : inserted;
}

/** Dopisuje fakty do profilu zalogowanej osoby (albo tworzy go, gdy go jeszcze nie ma). */
export async function saveProfile(db: UserDb | null, update: { name?: string; preferences: Preferences }) {
  if (!db) return { ok: false as const, blad: "Pamięć o użytkowniku jest wyłączona – brak konfiguracji bazy." };
  const current = await loadProfile(db);
  const preferences = mergePreferences(current?.preferences ?? {}, update.preferences);
  const row = { ...(update.name ? { name: update.name } : {}), preferences };
  const { error } = await writeProfileRow(db, current, row);
  if (error) {
    console.error("[baza] nie udało się zapisać profilu", error.code, error.message);
    return { ok: false as const, blad: "Nie udało się zapisać profilu w bazie." };
  }
  return { ok: true as const, name: update.name ?? current?.name ?? null, preferences };
}

/**
 * Narzędzie zapiszProfil dla jednej rozmowy: zapisuje w profilu osoby, która jest zalogowana
 * w tym zapytaniu (db z jej sesją). Model podaje tylko fakty – nie ma jak wskazać innej osoby.
 */
export const createZapiszProfilTool = (db: UserDb | null) => tool({
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
    const result = await saveProfile(db, { name, preferences: accepted });
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
 * Zapis z formularza /profile: zastępuje imię i preferencje we własnym wierszu
 * (to, co użytkownik usunął, znika). Dane wrażliwe są odrzucane jak przy narzędziu.
 */
export async function replaceProfile(db: UserDb | null, input: { name: string | null; preferences: Record<string, string> }) {
  if (!db) return { ok: false as const, blad: "Profil jest wyłączony – brak konfiguracji bazy." };
  const name = input.name === null ? null : sanitizeName(input.name) ?? null;
  const { accepted, rejected } = sanitizeFacts(
    Object.entries(input.preferences).map(([nazwa, wartosc]) => ({ nazwa, wartosc })),
  );
  const preferences = mergePreferences({}, accepted);
  const current = await loadProfile(db);
  const row = { name, preferences };
  const { error } = await writeProfileRow(db, current, row);
  if (error) {
    console.error("[baza] nie udało się zapisać profilu", error.code, error.message);
    return { ok: false as const, blad: "Nie udało się zapisać profilu w bazie." };
  }
  return { ok: true as const, profile: { name, preferences }, rejected };
}
