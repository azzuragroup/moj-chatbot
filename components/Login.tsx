"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword("");
        router.refresh();
      } else {
        setError(await res.text());
      }
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "0 auto", padding: 24 }}>
      <h1>Wpisz hasło</h1>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Hasło"
          autoFocus
          style={{ padding: 10, fontSize: 16 }}
        />
        <button type="submit" disabled={!password || busy} style={{ padding: 10, fontSize: 16 }}>
          Wejdź
        </button>
        {error && (
          <div role="alert" style={{ color: "#b00020" }}>
            {error}
          </div>
        )}
      </form>
    </main>
  );
}
