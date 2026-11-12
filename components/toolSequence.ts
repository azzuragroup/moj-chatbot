type Part = { type: string; toolName?: unknown; url?: unknown; title?: unknown };

export type SourceLink = { url: string; title?: string };

/**
 * Nazwy narzędzi w kolejności użycia. Kolejne użycia tego samego narzędzia
 * pod rząd liczymy raz. Wyszukiwanie OpenRouter działa po stronie serwera,
 * więc rozpoznajemy je po pierwszym źródle w odpowiedzi.
 */
export function toolSequence(parts: Part[]): string[] {
  const out: string[] = [];
  for (const p of parts) {
    let name: string | null = null;
    if (p.type.startsWith("tool-")) name = p.type.slice(5);
    else if (p.type === "dynamic-tool" && p.toolName) name = String(p.toolName);
    else if (p.type === "source-url") name = "web_search";
    if (name && out[out.length - 1] !== name) out.push(name);
  }
  return out;
}

const isHttp = (u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u);

/** Źródła z odpowiedzi (części source-url), bez powtórzeń i tylko http(s). */
export function collectSources(parts: Part[]): { sources: SourceLink[] } {
  const seen = new Set<string>();
  const sources: SourceLink[] = [];
  const add = (url: unknown, title: unknown) => {
    if (!isHttp(url) || seen.has(url)) return;
    seen.add(url);
    sources.push({ url, title: typeof title === "string" ? title : undefined });
  };
  for (const p of parts) {
    if (p.type === "source-url") add(p.url, p.title);
  }
  return { sources };
}
