"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Zalogowana osoba – tylko do wyświetlenia w nagłówku: e-mail, imię i avatar z konta Google.
 * Wartości ustala serwer (layout → getCurrentUser, zweryfikowana sesja), przeglądarka niczego tu nie decyduje.
 */
export type HeaderUser = { email: string; name: string | null; avatarUrl: string | null };

const CurrentUserContext = createContext<HeaderUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: HeaderUser | null; children: ReactNode }) {
  return <CurrentUserContext value={user}>{children}</CurrentUserContext>;
}

export const useCurrentUser = () => useContext(CurrentUserContext);
