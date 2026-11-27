"use client";

import { useEffect } from "react";

/** Kanał między kartami tej samej aplikacji: wylogowanie w jednej karcie czyści pozostałe. */
export const AUTH_CHANNEL = "azzura-auth";

/**
 * Pilnuje, żeby po wylogowaniu nie było widać danych poprzedniej osoby:
 * - przycisk „Wstecz”: przeglądarka potrafi pokazać stronę z pamięci (bfcache) bez pytania serwera.
 *   Wtedy przeładowujemy ją – serwer od nowa sprawdzi sesję i bez niej przekieruje na /login.
 * - inne otwarte karty: po wylogowaniu w jednej karcie pozostałe od razu przechodzą na /login.
 */
export default function SessionGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data === "logout" && window.location.pathname !== "/login") window.location.replace("/login");
      };
    }

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      channel?.close();
    };
  }, []);

  return null;
}
