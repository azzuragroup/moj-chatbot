"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCurrentUserEmail } from "./CurrentUser";
import { AUTH_CHANNEL } from "./SessionGuard";
import ThemeSelect from "./ThemeSelect";

const TABS = [
  { href: "/", label: "Czat" },
  { href: "/history", label: "Historia" },
  { href: "/profile", label: "Profil" },
  { href: "/analiza", label: "Analiza wiadomości" },
  { href: "/porownanie", label: "Porównanie" },
  { href: "/dashboard", label: "Asystent podróży" },
  { href: "/planer", label: "Planer social media" },
];

/** Nagłówek wszystkich stron: logo, tytuł, motyw, e-mail zalogowanej osoby, wylogowanie i zakładki. */
export default function AppHeader() {
  const pathname = usePathname();
  const email = useCurrentUserEmail();
  const signedIn = Boolean(email);
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Nawet bez odpowiedzi przechodzimy na /login – serwer i tak sprawdzi sesję.
    }
    // Inne karty tej aplikacji też czyszczą ekran.
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.postMessage("logout");
      channel.close();
    } catch {}
    // replace + pełne przeładowanie: znika cały stan strony (rozmowa, historia, profil),
    // a bieżąca strona nie zostaje w historii pod przyciskiem „Wstecz”.
    window.location.replace("/login");
  }

  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <span className="app-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-azzura.svg" alt="Azzura Group" />
          </span>
          <div>
            <p className="kicker">Azzura Group · asystent AI</p>
            <h1>Asystent marketingowy</h1>
            <p className="app-subtitle">Posty, opisy produktów, maile i odpowiedzi na zapytania ofertowe</p>
          </div>
        </div>
        <div className="app-controls">
          <ThemeSelect />
          {signedIn && (
            <>
              <span className="app-user" title={email ?? undefined}>
                {email}
              </span>
              <button type="button" className="button-secondary" onClick={logout} disabled={leaving}>
                {leaving ? "Wylogowuję…" : "Wyloguj"}
              </button>
            </>
          )}
        </div>
      </header>
      {signedIn && (
        <nav className="tabs" aria-label="Sekcje">
          {TABS.map((t) => (
            <a key={t.href} href={t.href} aria-current={pathname === t.href ? "page" : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
