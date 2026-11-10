"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Chat() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const busy = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !busy;

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Studio Nova</h1>
        <a href="/analiza" style={{ marginLeft: "auto", marginRight: 12 }}>
          Analiza
        </a>
        <a href="/porownanie" style={{ marginRight: 12 }}>
          Porównanie
        </a>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            router.refresh();
          }}
        >
          Wyjdź
        </button>
      </div>

      <p style={{ margin: 0 }}>Dzień dobry! W czym mogę pomóc?</p>

      <div
        style={{
          flex: 1,
          minHeight: 300,
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              whiteSpace: "pre-wrap",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#e8f0fe" : "#f1f1f1",
              color: "#111",
              padding: "8px 12px",
              borderRadius: 8,
              maxWidth: "85%",
            }}
          >
            <ToolBadges message={m} />
            {m.parts.map((p, i) =>
              p.type === "text" ? <span key={i}>{p.text}</span> : null,
            )}
            <Sources message={m} />
          </div>
        ))}
        {status === "submitted" && (
          <div style={{ color: "#666" }}>Chatbot myśli…</div>
        )}
      </div>

      {error && (
        <div role="alert" style={{ color: "#b00020" }}>
          Błąd: {error.message}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          sendMessage({ text: input.trim() });
          setInput("");
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Napisz wiadomość..."
          style={{ flex: 1, padding: 10, fontSize: 16 }}
        />
        <button
          type="submit"
          disabled={!canSend}
          style={{ padding: "10px 16px", fontSize: 16 }}
        >
          Wyślij
        </button>
      </form>
    </main>
  );
}

function Sources({ message }: { message: UIMessage }) {
  const seen = new Set<string>();
  const sources = message.parts.filter(
    (p): p is Extract<UIMessage["parts"][number], { type: "source-url" }> =>
      p.type === "source-url" &&
      /^https?:\/\//i.test(p.url) &&
      !seen.has(p.url) &&
      !!seen.add(p.url),
  );
  if (sources.length === 0) return null;

  const fetchedAt = (message.metadata as { fetchedAt?: string } | undefined)?.fetchedAt;

  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #ccc", whiteSpace: "normal" }}>
      <strong>Źródła</strong>
      <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title || s.url}
            </a>
          </li>
        ))}
      </ul>
      {fetchedAt && (
        <div style={{ color: "#666", fontSize: 13 }}>
          pobrano: {new Date(fetchedAt).toLocaleString("pl-PL")}
        </div>
      )}
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  web_search: "🔎 wyszukiwanie",
  aktualnyCzas: "🕒 aktualnyCzas",
};

/** Etykiety narzędzi użytych w odpowiedzi. Bez narzędzi nic nie pokazuje. */
function ToolBadges({ message }: { message: UIMessage }) {
  if (message.role !== "assistant") return null;
  const used = new Set<string>();
  for (const p of message.parts) {
    if (p.type.startsWith("tool-")) used.add(p.type.slice(5));
    else if (p.type === "dynamic-tool" && "toolName" in p) used.add(String(p.toolName));
    // Wyszukiwanie OpenRouter działa po stronie serwera i zostawia po sobie źródła.
    else if (p.type === "source-url") used.add("web_search");
  }
  if (used.size === 0) return null;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6, whiteSpace: "normal" }}>
      {[...used].map((name) => (
        <span
          key={name}
          style={{ fontSize: 12, background: "#e2e2e2", color: "#333", borderRadius: 999, padding: "2px 8px" }}
        >
          {TOOL_LABELS[name] ?? `🛠 ${name}`}
        </span>
      ))}
    </div>
  );
}
