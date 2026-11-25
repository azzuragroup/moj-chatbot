/**
 * Źródła z bazy wiedzy pod odpowiedzią agenta.
 * Czysta funkcja bez importów lokalnych (testowana bezpośrednio w Node).
 *
 * Bierzemy fragmenty zwrócone przez narzędzie searchKnowledge (już powyżej progu podobieństwa)
 * i zostawiamy tylko te z dokumentów wskazanych w linii „📎 Źródło: …” odpowiedzi.
 * Bez tej linii (np. „Nie mam tej informacji w bazie wiedzy”) nie pokazujemy źródeł.
 */

type Part = { type: string; state?: unknown; output?: unknown; text?: unknown };

export type KnowledgeSource = { title: string; content: string; similarity: number };

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleLowerCase("pl-PL");

/** Tytuły z linii „📎 Źródło: A, B” (bez nawiasów, cudzysłowów i pogrubień). */
export function citedTitles(text: string): string[] {
  const titles: string[] = [];
  for (const m of text.matchAll(/📎\s*\**\s*Źródł[oa]\s*\**\s*:\s*\**(.+)$/gimu)) {
    for (const raw of m[1].split(/[,;]/)) {
      const t = raw.replace(/[*_`„”"»«[\]]/g, "").trim();
      if (t) titles.push(t);
    }
  }
  return titles;
}

export function knowledgeSources(parts: Part[]): KnowledgeSource[] {
  const text = parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n");
  const cited = citedTitles(text).map(norm);
  if (cited.length === 0) return [];

  const seen = new Set<string>();
  const out: KnowledgeSource[] = [];
  for (const p of parts) {
    if (p.type !== "tool-searchKnowledge" || p.state !== "output-available") continue;
    const fragments = (p.output as { fragmenty?: unknown } | null)?.fragmenty;
    if (!Array.isArray(fragments)) continue;
    for (const f of fragments as { tytul?: unknown; tresc?: unknown; podobienstwo?: unknown }[]) {
      const title = String(f.tytul ?? "");
      const content = String(f.tresc ?? "");
      const similarity = Number(f.podobienstwo);
      if (!title || !content || !Number.isFinite(similarity)) continue;
      if (!cited.includes(norm(title)) || seen.has(content)) continue;
      seen.add(content);
      out.push({ title, content, similarity });
    }
  }
  return out.sort((a, b) => b.similarity - a.similarity);
}

/** 0.612 → „61%”. */
export const percent = (similarity: number) => `${Math.round(similarity * 100)}%`;
