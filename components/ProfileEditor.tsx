"use client";

import { useState } from "react";
import { MARKETING_FIELDS } from "@/lib/profileCore";

const MARKETING_KEYS = new Set<string>(MARKETING_FIELDS.map((f) => f.key));

type Prefs = Record<string, string>;
type Profile = { name: string | null; preferences: Prefs };

const label = (key: string) => {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Edycja profilu: imię i preferencje – poprawianie, usuwanie, dodawanie, czyszczenie. */
export default function ProfileEditor({ initialName, initialPreferences }: { initialName: string; initialPreferences: Prefs }) {
  const [saved, setSaved] = useState<Profile>({ name: initialName || null, preferences: initialPreferences });
  const [name, setName] = useState(initialName);
  const [drafts, setDrafts] = useState<Prefs>(initialPreferences);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "warning"; text: string } | null>(null);

  async function send(body: unknown, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) throw new Error("Sesja wygasła. Odśwież stronę i zaloguj się.");
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error(data?.message ?? "Nie udało się zapisać profilu.");
      const profile = data.profile as Profile;
      setSaved(profile);
      setName(profile.name ?? "");
      setDrafts(profile.preferences);
      setMessage(
        data.odrzucone?.length
          ? { kind: "warning", text: `${okText} Pominięto dane wrażliwe: ${data.odrzucone.join(", ")}.` }
          : { kind: "ok", text: okText },
      );
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Nie udało się zapisać profilu." });
    } finally {
      setBusy(false);
    }
  }

  // Każda zmiana zapisuje cały profil w tym samym wierszu – bez drugiej wersji.
  const save = (next: Profile, okText: string) =>
    send({ mode: "save", name: next.name, preferences: next.preferences }, okText);

  function saveName() {
    save({ name: name.trim() || null, preferences: saved.preferences }, "Zapisano imię ✓");
  }
  function removeName() {
    save({ name: null, preferences: saved.preferences }, "Usunięto imię ✓");
  }
  function saveFact(key: string) {
    const value = drafts[key]?.trim();
    if (!value) return;
    const field = MARKETING_FIELDS.find((f) => f.key === key);
    if (field) {
      save({ name: saved.name, preferences: { ...saved.preferences, [key]: value } }, `Zapisano „${field.label}” ✓`);
      return;
    }
    save({ name: saved.name, preferences: { ...saved.preferences, [key]: value } }, `Zapisano „${label(key)}” ✓`);
  }
  function removeFact(key: string) {
    const { [key]: _removed, ...rest } = saved.preferences;
    void _removed;
    const field = MARKETING_FIELDS.find((f) => f.key === key);
    save({ name: saved.name, preferences: rest }, `Usunięto „${field?.label ?? label(key)}” ✓`);
  }
  function addFact(e: React.FormEvent) {
    e.preventDefault();
    const key = newKey.trim();
    const value = newValue.trim();
    if (!key || !value) return;
    save({ name: saved.name, preferences: { ...saved.preferences, [key]: value } }, `Dodano „${key}” ✓`).then(() => {
      setNewKey("");
      setNewValue("");
    });
  }
  function clearAll() {
    if (!window.confirm("Wyczyścić cały profil? Agent zapomni imię i wszystkie preferencje.")) return;
    send({ mode: "clear" }, "Profil wyczyszczony ✓");
  }

  const keys = Object.keys(saved.preferences).filter((k) => !MARKETING_KEYS.has(k));
  const empty = !saved.name && Object.keys(saved.preferences).length === 0;

  return (
    <div className="profile">
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "error" : message.kind === "warning" ? "warning" : "note"}>
          {message.text}
        </p>
      )}

      <section className="card profile-card">
        <h3>Imię</h3>
        <div className="profile-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Dagmara"
            maxLength={60}
            aria-label="Imię"
          />
          <button type="button" onClick={saveName} disabled={busy || name.trim() === (saved.name ?? "")}>
            Zapisz
          </button>
          <button type="button" className="button-secondary" onClick={removeName} disabled={busy || !saved.name}>
            Usuń
          </button>
        </div>
      </section>

      <section className="card profile-card">
        <h3>Preferencje marketingowe</h3>
        <p className="note" style={{ margin: 0 }}>
          Agent stosuje je sam w każdej odpowiedzi. Jeśli czegoś brakuje, dopyta na początku rozmowy.
        </p>
        {MARKETING_FIELDS.map((f) => (
          <div key={f.key} className="profile-row">
            <label className="profile-label" htmlFor={`pref-${f.key}`}>
              {f.label}
            </label>
            <input
              id={`pref-${f.key}`}
              type="text"
              value={drafts[f.key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
              placeholder={`np. ${f.example}`}
              maxLength={200}
            />
            <button
              type="button"
              onClick={() => saveFact(f.key)}
              disabled={busy || !drafts[f.key]?.trim() || drafts[f.key].trim() === saved.preferences[f.key]}
            >
              Zapisz
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => removeFact(f.key)}
              disabled={busy || !saved.preferences[f.key]}
            >
              Usuń
            </button>
          </div>
        ))}
      </section>

      <section className="card profile-card">
        <h3>Inne preferencje</h3>
        {keys.length === 0 && <p className="note">Brak innych zapisanych preferencji. Powiedz o sobie w czacie albo dodaj poniżej.</p>}
        {keys.map((key) => (
          <div key={key} className="profile-row">
            <label className="profile-label" htmlFor={`pref-${key}`}>
              {label(key)}
            </label>
            <input
              id={`pref-${key}`}
              type="text"
              value={drafts[key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
              maxLength={200}
            />
            <button
              type="button"
              onClick={() => saveFact(key)}
              disabled={busy || !drafts[key]?.trim() || drafts[key].trim() === saved.preferences[key]}
            >
              Zapisz
            </button>
            <button type="button" className="button-secondary" onClick={() => removeFact(key)} disabled={busy}>
              Usuń
            </button>
          </div>
        ))}

        <form className="profile-row profile-add" onSubmit={addFact}>
          <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Nazwa, np. miasto" maxLength={40} aria-label="Nazwa nowej preferencji" />
          <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Wartość, np. Rzeszów" maxLength={200} aria-label="Wartość nowej preferencji" />
          <button type="submit" className="button-secondary" disabled={busy || !newKey.trim() || !newValue.trim()}>
            + Dodaj
          </button>
        </form>
      </section>

      <div className="profile-footer">
        <button type="button" className="stop-button" onClick={clearAll} disabled={busy || empty}>
          Wyczyść cały profil
        </button>
        <a href="/">← Wróć do czatu</a>
      </div>
    </div>
  );
}
