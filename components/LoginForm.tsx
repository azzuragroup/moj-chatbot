"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_MESSAGES, MIN_PASSWORD, authErrorMessage, signUpOutcome, validateCredentials, type AuthMode } from "@/lib/authMessages";
import { safeNextPath } from "@/lib/authRedirect";

const TABS: { mode: AuthMode; label: string }[] = [
  { mode: "login", label: "Zaloguj się" },
  { mode: "signup", label: "Załóż konto" },
];

/** Logowanie i zakładanie konta (Supabase Auth, e-mail i hasło). */
export default function LoginForm({ next = "/", initialError = "" }: { next?: string; initialError?: string }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  function switchTo(next: AuthMode) {
    setMode(next);
    setError("");
    setInfo("");
  }

  // Cel po zalogowaniu: sprawdzony jeszcze raz (tylko adres wewnątrz aplikacji).
  const target = safeNextPath(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setInfo("");
    const invalid = validateCredentials(email, password, mode);
    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    let leaving = false;
    // Pełne przeładowanie: serwer od nowa sprawdza sesję i rysuje nagłówek z e-mailem.
    // Przycisk zostaje zablokowany („Chwileczkę…”) aż do zmiany strony.
    const goToTarget = () => {
      leaving = true;
      window.location.assign(target);
    };
    const supabase = createClient();
    const cleanEmail = email.trim();
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) {
          setError(authErrorMessage(err));
          return;
        }
        goToTarget();
        return;
      }

      const confirmUrl = new URL("/auth/confirm", window.location.origin);
      if (target !== "/") confirmUrl.searchParams.set("next", target);
      const { data, error: err } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: confirmUrl.toString() },
      });
      if (err) {
        setError(authErrorMessage(err));
        return;
      }
      const outcome = signUpOutcome(data);
      if (outcome === "signed-in") {
        goToTarget();
      } else if (outcome === "exists") {
        setError(AUTH_MESSAGES.accountExists);
      } else if (outcome === "confirm") {
        setPassword("");
        setInfo(`Konto założone. Wysłaliśmy link na adres ${cleanEmail}. Kliknij go, żeby potwierdzić e-mail – wtedy od razu się zalogujesz.`);
      } else {
        setError(AUTH_MESSAGES.unknown);
      }
    } catch {
      setError(AUTH_MESSAGES.network);
    } finally {
      if (!leaving) setBusy(false);
    }
  }

  return (
    <div className="card login-card">
      <div className="auth-tabs" role="tablist" aria-label="Logowanie">
        {TABS.map((t) => (
          <button
            key={t.mode}
            type="button"
            role="tab"
            id={`tab-${t.mode}`}
            aria-selected={mode === t.mode}
            aria-controls="auth-panel"
            className={mode === t.mode ? "auth-tab active" : "auth-tab"}
            onClick={() => switchTo(t.mode)}
            disabled={busy}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
        <h1>{mode === "login" ? "Zaloguj się" : "Załóż konto"}</h1>
        <p>Asystent marketingowy Azzura Group</p>
        <form onSubmit={submit} noValidate>
          <label className="upload-label" htmlFor="auth-email">
            E-mail
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan@firma.pl"
            disabled={busy}
            autoFocus
          />
          <label className="upload-label" htmlFor="auth-password">
            Hasło
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? `Co najmniej ${MIN_PASSWORD} znaków` : "Hasło"}
            disabled={busy}
          />
          <button type="submit" disabled={busy} aria-busy={busy}>
            {busy ? "Chwileczkę…" : mode === "login" ? "Zaloguj się" : "Załóż konto"}
          </button>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {info && (
            <div role="status" className="auth-info">
              {info}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
