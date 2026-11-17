"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import type { TravelCard, TravelResult } from "@/lib/travel";

const ICONS: Record<TravelCard["id"], string> = {
  pogoda: "🌤️",
  waluty: "💱",
  swieta: "📅",
  wikipedia: "📚",
  czas: "🕒",
};

const MAX_DAYS_AHEAD = 15;

function warsawDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", second: "2-digit" });

const isHttp = (url: string) => /^https?:\/\//i.test(url);

type Summary = { text: string; pobrano: string } | { error: string } | null;

export default function Dashboard() {
  const [city, setCity] = useState("");
  const [date, setDate] = useState(() => warsawDate());
  const [query, setQuery] = useState<{ miasto: string; data: string } | null>(null);
  const [result, setResult] = useState<Extract<TravelResult, { ok: true }> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function fetchCards(q: { miasto: string; data: string }) {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(q),
    });
    if (res.status === 401) throw new Error("Sesja wygasła. Odśwież stronę i zaloguj się.");
    const data = (await res.json()) as TravelResult;
    if (!data.ok) throw new Error(data.blad);
    return data;
  }

  async function fetchSummary(q: { miasto: string; data: string }, cards: TravelCard[]) {
    setSummaryLoading(true);
    setSummary(null);
    try {
      const res = await fetch("/api/dashboard/podsumowanie", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...q,
          karty: cards.map((k) =>
            k.ok
              ? { tytul: k.tytul, ok: true, wartosc: k.wartosc, opis: k.opis, szczegoly: k.szczegoly }
              : { tytul: k.tytul, ok: false, blad: k.blad },
          ),
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) setSummary({ text: data.podsumowanie, pobrano: data.pobrano });
      else setSummary({ error: data?.message ?? "Nie udało się przygotować podsumowania." });
    } catch {
      setSummary({ error: "Nie udało się połączyć z serwerem." });
    } finally {
      setSummaryLoading(false);
    }
  }

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const q = { miasto: city.trim(), data: date };
    if (!q.miasto || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchCards(q);
      setResult(data);
      setQuery(q);
      void fetchSummary(q, data.karty);
    } catch (err) {
      setResult(null);
      setSummary(null);
      setError(err instanceof Error ? err.message : "Nie udało się pobrać danych.");
    } finally {
      setLoading(false);
    }
  }

  // Odśwież: te same miasto i data, nowe dane i godziny pobrania (bez nowego podsumowania).
  async function refresh() {
    if (!query || loading) return;
    setLoading(true);
    setError("");
    try {
      setResult(await fetchCards(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się odświeżyć danych.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page page-wide">
      <AppHeader />
      <p className="back-link">
        <a href="/">← Wróć do czatu</a>
      </p>
      <h2 style={{ margin: "0 0 4px" }}>Asystent podróży</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Wpisz miasto i dzień wyjazdu (do {MAX_DAYS_AHEAD} dni naprzód). Karty pobierają dane z publicznych źródeł,
        a agent dopisuje krótkie podsumowanie.
      </p>

      <form className="card trip-form" onSubmit={check}>
        <label>
          <span>Dokąd jedziesz?</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="np. Praga"
            maxLength={100}
            required
          />
        </label>
        <label>
          <span>Kiedy?</span>
          <input
            type="date"
            value={date}
            min={warsawDate()}
            max={warsawDate(MAX_DAYS_AHEAD)}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={!city.trim() || loading}>
          {loading && !result ? "Sprawdzam…" : "Sprawdź"}
        </button>
      </form>

      {error && (
        <div role="alert" className="error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <section style={{ marginTop: 20 }} aria-live="polite">
          <div className="trip-head">
            <div>
              <h3 style={{ margin: 0 }}>
                {result.miejsce.nazwa}
                {result.miejsce.kraj ? `, ${result.miejsce.kraj}` : ""}
              </h3>
              <p className="note" style={{ marginTop: 2 }}>
                Dzień podróży: {new Date(`${result.data}T12:00:00Z`).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
              </p>
            </div>
            <button type="button" className="button-secondary" onClick={refresh} disabled={loading}>
              {loading ? "Odświeżam…" : "↻ Odśwież"}
            </button>
          </div>

          <div className="trip-cards">
            {result.karty.map((k) => (
              <article key={k.id} className={`trip-card${k.ok ? "" : " trip-card-error"}`}>
                <h4>
                  <span aria-hidden="true">{ICONS[k.id]}</span> {k.tytul}
                </h4>
                {k.ok ? (
                  <>
                    <p className="trip-value">{k.wartosc}</p>
                    {k.opis && <p className="trip-desc">{k.opis}</p>}
                    {k.szczegoly && k.szczegoly.length > 0 && (
                      <ul className="trip-details">
                        {k.szczegoly.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    )}
                    {k.link && isHttp(k.link.url) && (
                      <a href={k.link.url} target="_blank" rel="noopener noreferrer">
                        {k.link.tekst} ↗
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <p className="trip-value trip-value-missing">Brak danych</p>
                    <p className="error" style={{ margin: "4px 0 0", fontSize: 14 }}>
                      {k.blad}
                    </p>
                  </>
                )}
                <p className="trip-source">
                  Źródło: {k.zrodlo} · pobrano {clock(k.pobrano)}
                </p>
              </article>
            ))}
          </div>

          <div className="card trip-summary">
            <h4>Podsumowanie od agenta</h4>
            {summaryLoading && <p className="note">Agent przygotowuje podsumowanie…</p>}
            {summary && "text" in summary && (
              <>
                <p style={{ margin: "6px 0" }}>{summary.text}</p>
                <p className="trip-source">Na podstawie powyższych kart · przygotowano {clock(summary.pobrano)}</p>
              </>
            )}
            {summary && "error" in summary && (
              <p className="error">
                {summary.error}{" "}
                {query && (
                  <button type="button" className="button-secondary inline-btn" onClick={() => fetchSummary(query, result.karty)}>
                    Spróbuj ponownie
                  </button>
                )}
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
