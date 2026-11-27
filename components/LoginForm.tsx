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
  // Logowanie przez Google: formularz wysyła POST na /auth/google, a serwer przekierowuje do Google.
  const [googleBusy, setGoogleBusy] = useState(false);
  const locked = busy || googleBusy;

  function switchTo(next: AuthMode) {
    setMode(next);
    setError("");
    setInfo("");
  }

  // Cel po zalogowaniu: sprawdzony jeszcze raz (tylko adres wewnątrz aplikacji).
  const target = safeNextPath(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
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
            disabled={locked}
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
            disabled={locked}
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
            disabled={locked}
          />
          <button type="submit" disabled={locked} aria-busy={busy}>
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

        <div className="auth-divider" aria-hidden="true">
          <span>albo</span>
        </div>
        <form action="/auth/google" method="post" onSubmit={() => setGoogleBusy(true)}>
          <input type="hidden" name="next" value={target} />
          <button type="submit" className="button-secondary google-button" disabled={locked} aria-busy={googleBusy}>
            <GoogleIcon />
            {googleBusy ? "Chwileczkę…" : "Zaloguj przez Google"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Kolorowe „G” Google (wewnętrzny SVG, bez pobierania z zewnątrz). */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
