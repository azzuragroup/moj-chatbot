/**
 * Prosty, bezpieczny parser markdown dla odpowiedzi agenta.
 * Zwraca drzewo danych (bez HTML) – komponent rysuje je jako elementy React,
 * więc żaden tekst od modelu nie zostanie wykonany jako kod.
 * Obsługuje: **pogrubienie**, *kursywę*, `kod`, linki, nagłówki #, listy -/1.,
 * cytaty > i linię ---. Reszta zostaje zwykłym tekstem.
 */

// Linki rozpoznajemy tak samo jak w links.ts (kopia, bo testy Node nie przyjmują importów bez rozszerzenia).
type TextPart = { text: string; href?: string };

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)<>\]]+)/g;

/**
 * Dzieli tekst na fragmenty i linki. Rozpoznaje [opis](https://…) oraz gołe
 * adresy http(s). Inne schematy (np. javascript:) zostają zwykłym tekstem.
 */
function splitLinks(text: string): TextPart[] {
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


export type Inline =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "code"; text: string }
  | { type: "bold"; children: Inline[] }
  | { type: "italic"; children: Inline[] };

export type Block =
  | { type: "heading"; level: number; content: Inline[] }
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "list"; ordered: boolean; start: number; items: Inline[][] }
  | { type: "quote"; lines: Inline[][] }
  | { type: "hr" };

// **x** / __x__, *x*, _x_ (podkreślenia tylko na granicy słowa, żeby nie psuć nazw_typu_snake).
const EMPHASIS =
  /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1|(?<![\p{L}\p{N}*\\])\*(?=\S)([^*\n]+?)(?<=\S)\*(?!\*)|(?<![\p{L}\p{N}_])_(?=\S)([^_\n]+?)(?<=\S)_(?![\p{L}\p{N}_])/u;

function textAndLinks(text: string): Inline[] {
  return splitLinks(text).map((p) => (p.href ? { type: "link", text: p.text, href: p.href } : { type: "text", text: p.text }));
}

function parseEmphasis(text: string, depth: number): Inline[] {
  if (depth > 4) return textAndLinks(text);
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    const m = rest.match(EMPHASIS);
    if (!m || m.index === undefined) {
      out.push(...textAndLinks(rest));
      break;
    }
    if (m.index > 0) out.push(...textAndLinks(rest.slice(0, m.index)));
    if (m[2] !== undefined) out.push({ type: "bold", children: parseEmphasis(m[2], depth + 1) });
    else out.push({ type: "italic", children: parseEmphasis(m[3] ?? m[4], depth + 1) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

/** Tekst w linii → fragmenty (kod `…` ma pierwszeństwo, w nim nic nie formatujemy). */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const parts = text.split(/(`[^`\n]+`)/);
  for (const part of parts) {
    if (!part) continue;
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) out.push({ type: "code", text: part.slice(1, -1) });
    else out.push(...parseEmphasis(part, 0));
  }
  return out;
}

const HEADING = /^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/;
const BULLET = /^\s*[-*•+]\s+(.*)$/;
const ORDERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

/** Cały tekst → bloki (akapity, nagłówki, listy, cytaty). */
export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (HR.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    const h = line.match(HEADING);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, content: parseInline(h[2]) });
      i++;
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = !BULLET.test(line);
      const start = ordered ? Number(line.match(ORDERED)![1]) : 1;
      const items: Inline[][] = [];
      while (i < lines.length) {
        const m = ordered ? lines[i].match(ORDERED) : lines[i].match(BULLET);
        if (m) {
          items.push(parseInline(ordered ? m[2] : m[1]));
        } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) {
          // wcięta kontynuacja punktu
          items[items.length - 1].push({ type: "text", text: " " }, ...parseInline(lines[i].trim()));
        } else break;
        i++;
      }
      blocks.push({ type: "list", ordered, start, items });
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: Inline[][] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(parseInline(lines[i].match(QUOTE)![1]));
        i++;
      }
      blocks.push({ type: "quote", lines: quoted });
      continue;
    }
    // Akapit: kolejne zwykłe linie do pustej linii albo innego bloku.
    const para: Inline[][] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !HR.test(lines[i])
    ) {
      para.push(parseInline(lines[i]));
      i++;
    }
    blocks.push({ type: "paragraph", lines: para });
  }
  return blocks;
}
