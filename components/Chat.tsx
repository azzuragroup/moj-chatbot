"use client";

import { useChat } from "@ai-sdk/react";
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
        <h1 style={{ margin: 0 }}>Asystent Azzura</h1>
        <a href="/porownanie" style={{ marginLeft: "auto", marginRight: 12 }}>
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
            {m.parts.map((p, i) =>
              p.type === "text" ? <span key={i}>{p.text}</span> : null,
            )}
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
