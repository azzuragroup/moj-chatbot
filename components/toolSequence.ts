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

function toolNameOf(p: Part): string | null {
  if (p.type.startsWith("tool-")) return p.type.slice(5);
  if (p.type === "dynamic-tool" && p.toolName) return String(p.toolName);
  if (p.type === "source-url") return "web_search";
  return null;
}

export type StepEntry = { step: number; tools: string[] };

/**
 * Kroki agenta, w których użyto narzędzi: numer kroku modelu (od 1)
 * i nazwy narzędzi z tego kroku (bez powtórzeń). Kroki bez narzędzi
 * – np. końcowa odpowiedź tekstowa – pomijamy.
 */
export function stepSequence(parts: Part[]): StepEntry[] {
  const steps: StepEntry[] = [];
  let step = 0;
  for (const p of parts) {
    if (p.type === "step-start") {
      step += 1;
      continue;
    }
    const name = toolNameOf(p);
    if (!name) continue;
    const n = Math.max(step, 1);
    let entry = steps[steps.length - 1];
    if (!entry || entry.step !== n) {
      entry = { step: n, tools: [] };
      steps.push(entry);
    }
    if (!entry.tools.includes(name)) entry.tools.push(name);
  }
  return steps;
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
