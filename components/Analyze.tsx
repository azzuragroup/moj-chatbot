"use client";

import { useState } from "react";
import type { Analysis, FailureKind } from "@/lib/analysis";

type Failure = { kind: FailureKind; message: string; issues: string[] };

const CATEGORY_LABELS: Record<Analysis["category"], string> = {
  sales: "Sprzedaż (oferta i cena)",
  support: "Wsparcie (problem techniczny)",
  billing: "Rozliczenia (płatność lub zwrot)",
  unknown: "Nierozpoznana sprawa",
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
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
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
    <main style={{ maxWidth: 700, margin: "0 auto", padding: 24 }}>
      <p>
        <a href="/">← Wróć do czatu</a>
      </p>
      <h1>Analiza wiadomości klienta</h1>
      <p style={{ color: "#555" }}>
        Wklej wiadomość klienta. Asystent przygotuje szkic odpowiedzi.
        Niczego nie wysyła, nie rezerwuje i nie potwierdza płatności.
      </p>

      <form onSubmit={analyze} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Wiadomość klienta..."
          rows={6}
          style={{ padding: 10, fontSize: 16 }}
        />
        <button type="submit" disabled={!canSend} style={{ padding: 10, fontSize: 16 }}>
          {busy ? "Analizuję…" : "Analizuj"}
        </button>
      </form>

      {failure && (
        <div role="alert" style={{ marginTop: 16, color: "#b00020" }}>
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
        <section style={{ marginTop: 16, border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
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
          <div style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", color: "#111", padding: 12, borderRadius: 8 }}>
            {analysis.draft}
          </div>
        </section>
      )}
    </main>
  );
}
