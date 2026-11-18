"use client";

import { useState } from "react";

export type HistoryItem = { id: number; title: string; date: string; count: string };

/** Lista rozmów z przyciskiem „Usuń” (z potwierdzeniem). */
export default function HistoryList({ items }: { items: HistoryItem[] }) {
  const [list, setList] = useState(items);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function remove(item: HistoryItem) {
    if (!window.confirm(`Usunąć rozmowę „${item.title}”?\n\nZniknie razem ze wszystkimi wiadomościami. Tego nie da się cofnąć.`)) return;
    setBusy(item.id);
    setError("");
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "delete", id: item.id }),
      });
      if (res.status === 401) throw new Error("Sesja wygasła. Odśwież stronę i zaloguj się.");
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error(data?.message ?? "Nie udało się usunąć rozmowy.");
      setList((l) => l.filter((x) => x.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć rozmowy.");
    } finally {
      setBusy(null);
    }
  }

  if (list.length === 0) return <EmptyHistory />;

  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <ul className="history-list">
        {list.map((c) => (
          <li key={c.id} className="history-row">
            <a href={`/?c=${c.id}`} className="history-item">
              <span className="history-title">{c.title}</span>
              <span className="history-meta">
                {c.date} · {c.count}
              </span>
            </a>
            <button
              type="button"
              className="button-secondary inline-btn history-delete"
              onClick={() => remove(c)}
              disabled={busy !== null}
              aria-label={`Usuń rozmowę ${c.title}`}
            >
              {busy === c.id ? "Usuwam…" : "Usuń"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Pusta historia – zachęta głosem asystenta Azzura Group. */
export function EmptyHistory() {
  return (
    <div className="card history-empty">
      <p className="history-empty-title">Tu pojawią się nasze rozmowy 🔵</p>
      <p style={{ margin: 0 }}>
        Zacznijmy od konkretu: przygotuję post na LinkedIn o płycie BoardeX, opis drewna Dragonwood albo
        odpowiedź na zapytanie ofertowe. Każdą rozmowę zapiszę tutaj, żeby można było do niej wrócić.
      </p>
      <a href="/?nowa=1">Zacznij pierwszą rozmowę →</a>
    </div>
  );
}
