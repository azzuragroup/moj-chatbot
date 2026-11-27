"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * E-mail zalogowanej osoby – tylko do wyświetlenia w nagłówku.
 * Wartość ustala serwer (layout → getCurrentUser), przeglądarka niczego tu nie decyduje.
 */
const CurrentUserEmail = createContext<string | null>(null);

export function CurrentUserProvider({ email, children }: { email: string | null; children: ReactNode }) {
  return <CurrentUserEmail value={email}>{children}</CurrentUserEmail>;
}

export const useCurrentUserEmail = () => useContext(CurrentUserEmail);
