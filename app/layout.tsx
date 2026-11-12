import type { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });

export const metadata = { title: "Asystent marketingowy Azzura Group" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <header className="brand-bar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-azzura.svg" alt="Azzura Group" />
          <span>Azzura Group</span>
        </header>
        {children}
      </body>
    </html>
  );
}
