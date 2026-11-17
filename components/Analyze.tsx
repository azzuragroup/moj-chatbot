"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import type { Analysis, FailureKind } from "@/lib/analysis";

type Failure = { kind: FailureKind; message: string; issues: string[] };

const CATEGORY_LABELS: Record<Analysis["category"], string> = {
  zapytanie_ofertowe: "Zapytanie ofertowe (cena, wycena, oferta)",
  produkt: "Informacja o produkcie",
  reklamacja_dostawa: "Reklamacja / dostawa",
  inne: "Inne",
};

const FAILURE_LABELS: Record<FailureKind, string> = {
  validation: "Niepoprawny wynik",
  refusal: "Odmowa modelu",
  interrupted: "Przerwana odpowiedź",
  provider: "Błąd dostawcy",
  config: "Problem z konfiguracją",
};

export default function Analyze() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const canSend = message.trim().length > 0 && !busy;

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setAnalysis(null);
    setFailure(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "analyze", message }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!isJson) {
        setFailure({ kind: "provider", message: await res.text(), issues: [] });
        return;
      }
      const data = await res.json();
      if (data.ok) setAnalysis(data.analysis);
      else setFailure({ kind: data.kind, message: data.message, issues: data.issues ?? [] });
    } catch {
      setFailure({ kind: "provider", message: "Nie udało się połączyć z serwerem.", issues: [] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <AppHeader />
      <h2 style={{ margin: "0 0 4px" }}>Analiza wiadomości klienta</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Wklej wiadomość klienta. Asystent przygotuje szkic odpowiedzi.
        Niczego nie wysyła, nie rezerwuje i nie potwierdza płatności.
      </p>

      <form onSubmit={analyze} className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Wiadomość klienta…"
          aria-label="Wiadomość klienta"
          rows={6}
        />
        <button type="submit" disabled={!canSend}>
          {busy ? "Analizuję…" : "Analizuj"}
        </button>
      </form>

      {failure && (
        <div role="alert" className="error" style={{ marginTop: 16 }}>
          <strong>{FAILURE_LABELS[failure.kind] ?? "Błąd"}:</strong> {failure.message}
          {failure.issues.length > 0 && (
            <ul>
              {failure.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {analysis && (
        <section className="card" style={{ marginTop: 16 }}>
          <p>
            <strong>Kategoria:</strong> {CATEGORY_LABELS[analysis.category]}
          </p>
          <p>
            <strong>Priorytet:</strong>{" "}
            {analysis.priority === "high" ? "🔴 Wysoki" : "Normalny"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {analysis.needs_review
              ? "⚠️ Wymaga sprawdzenia lub decyzji pracownika"
              : "Szkic gotowy — przeczytaj przed wysłaniem"}
          </p>
          <p style={{ marginBottom: 4 }}>
            <strong>Szkic odpowiedzi:</strong>
          </p>
          <div style={{ whiteSpace: "pre-wrap", background: "var(--azzura-light)", color: "var(--azzura-dark)", padding: 14, borderRadius: "var(--radius-sm)" }}>
            {analysis.draft}
          </div>
        </section>
      )}
    </main>
  );
}
