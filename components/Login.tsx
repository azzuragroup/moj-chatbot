"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AppHeader from "./AppHeader";

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
    <main className="login-page">
      <AppHeader signedIn={false} />
      <div className="card login-card">
        <h1>Wpisz hasło</h1>
        <p>Asystent marketingowy Azzura Group</p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Hasło"
            aria-label="Hasło"
            autoFocus
          />
          <button type="submit" disabled={!password || busy}>
            Wejdź
          </button>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
