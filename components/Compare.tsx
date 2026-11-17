"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import { TASKS, VARIANTS, type VariantId } from "@/lib/compare";

type Answer =
  | { text: string; result: number | null; correct: boolean }
  | { error: string };

const LABELS: Record<VariantId, string> = {
  plain: "Bez instrukcji rozumowania",
  stepByStep: "Z instrukcją „krok po kroku”",
};

export default function Compare() {
  const [answers, setAnswers] = useState<Record<string, Record<VariantId, Answer>>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(taskId: string) {
    setBusy(taskId);
    setError("");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnswers((a) => ({ ...a, [taskId]: data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd połączenia.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="page page-wide">
      <AppHeader />
      <h2 style={{ margin: "0 0 4px" }}>Porównanie: bez i z rozumowaniem krok po kroku</h2>
      <p style={{ color: "var(--muted)" }}>
        Każde kliknięcie to 2 płatne wywołania modelu. Ocena sprawdza tylko,
        czy liczba w linii „Wynik:” jest poprawna. Długość odpowiedzi jest
        podana informacyjnie i nie wpływa na ocenę.
      </p>
      {error && (
        <div role="alert" style={{ color: "var(--danger)" }}>
          Błąd: {error}
        </div>
      )}

      {TASKS.map((task) => (
        <section
          key={task.id}
          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 16, marginTop: 16 }}
        >
          <p style={{ marginTop: 0 }}>
            <strong>Zadanie:</strong> {task.question}
            <br />
            <strong>Poprawny wynik:</strong> {task.expected} {task.unit}
          </p>
          <button type="button" disabled={busy !== ""} onClick={() => run(task.id)}>
            {busy === task.id ? "Model odpowiada…" : "Uruchom porównanie"}
          </button>

          {answers[task.id] && (
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              {(Object.keys(VARIANTS) as VariantId[]).map((v) => {
                const a = answers[task.id][v];
                return (
                  <div
                    key={v}
                    style={{ flex: "1 1 300px", background: "var(--azzura-light)", borderRadius: 8, padding: 12, color: "var(--text)" }}
                  >
                    <strong>{LABELS[v]}</strong>
                    {"error" in a ? (
                      <p style={{ color: "var(--danger)" }}>{a.error}</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 18 }}>
                          {a.correct ? "✅ Poprawny wynik" : "❌ Błędny wynik"}
                          {" — "}model podał: {a.result ?? "brak linii „Wynik:”"}
                        </p>
                        <p style={{ color: "var(--muted)", fontSize: 13 }}>
                          Długość: {a.text.length} znaków (bez wpływu na ocenę)
                        </p>
                        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{a.text}</pre>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
