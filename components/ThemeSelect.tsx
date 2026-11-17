"use client";

import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";

const STORAGE_KEY = "motyw";

/** Wybór motywu: systemowy (domyślnie), jasny albo ciemny. Zapamiętany w przeglądarce. */
export default function ThemeSelect() {
  // null do czasu załadowania w przeglądarce (serwer nie zna zapisanego wyboru).
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setChoice(current === "light" || current === "dark" ? current : "system");
  }, []);

  function change(next: Choice) {
    const root = document.documentElement;
    try {
      if (next === "system") {
        delete root.dataset.theme;
        localStorage.removeItem(STORAGE_KEY);
      } else {
        root.dataset.theme = next;
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Brak dostępu do pamięci przeglądarki: motyw działa do odświeżenia strony.
    }
    setChoice(next);
  }

  return (
    <label className="theme-select">
      <span>Motyw</span>
      <select
        value={choice ?? "system"}
        disabled={choice === null}
        onChange={(e) => change(e.target.value as Choice)}
      >
        <option value="system">Systemowy</option>
        <option value="light">Jasny</option>
        <option value="dark">Ciemny</option>
      </select>
    </label>
  );
}
