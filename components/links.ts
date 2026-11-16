export type TextPart = { text: string; href?: string };

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)<>\]]+)/g;

/**
 * Dzieli tekst na fragmenty i linki. Rozpoznaje [opis](https://…) oraz gołe
 * adresy http(s). Inne schematy (np. javascript:) zostają zwykłym tekstem.
 */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    if (m[2]) {
      parts.push({ text: m[1], href: m[2] });
    } else {
      // Kropka lub przecinek na końcu zdania nie należy do adresu.
      const url = m[3].replace(/[.,;:!?]+$/, "");
      parts.push({ text: url, href: url });
      if (url.length < m[3].length) parts.push({ text: m[3].slice(url.length) });
    }
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
