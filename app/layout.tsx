import type { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });

export const metadata = { title: "Asystent marketingowy Azzura Group" };

// Ustawia zapamiętany motyw, zanim strona się narysuje (bez mignięcia).
// Bez zapisanego wyboru motyw wynika z ustawienia systemu (CSS).
const THEME_SCRIPT = `try{var t=localStorage.getItem("motyw");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
