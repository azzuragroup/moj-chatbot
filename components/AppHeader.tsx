"use client";

import { usePathname, useRouter } from "next/navigation";
import ThemeSelect from "./ThemeSelect";

const TABS = [
  { href: "/", label: "Czat" },
  { href: "/analiza", label: "Analiza wiadomości" },
  { href: "/porownanie", label: "Porównanie" },
  { href: "/dashboard", label: "Asystent podróży" },
  { href: "/planer", label: "Planer social media" },
];

/** Nagłówek wszystkich stron: logo, tytuł, motyw, wyjście i zakładki. */
export default function AppHeader({ signedIn = true }: { signedIn?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

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
            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                router.refresh();
              }}
            >
              Wyjdź
            </button>
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
