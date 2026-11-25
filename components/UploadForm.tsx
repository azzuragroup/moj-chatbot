"use client";

import { useRef, useState } from "react";
import {
  MAX_CONTENT,
  MAX_TITLE,
  STAGE_LABELS,
  chunksLabel,
  formatVersion,
  sameTitle,
  FIXED_OVERLAP,
  FIXED_SIZE,
  type ImportStage,
  type SplitMode,
} from "@/lib/chunkingCore";

/** Dokument na liście: tytuł = źródło, version = data dodania (sformatowana). */
export type DocumentItem = { id: number; title: string; version: string; chunks: number };

type Message = { kind: "ok" | "warning" | "error"; text: string; hint?: string };
type Result =
  | { ok: true; title: string; chunks: number; replaced: number; uzupelniono: number; nieUzupelniono: number; warning?: string }
  | { ok: false; stage?: ImportStage; message: string; hint?: string; exists?: boolean };

const STAGES: ImportStage[] = ["split", "embed", "save"];

/** Formularz dodawania dokumentu do bazy wiedzy + lista dokumentów w bazie. */
export default function UploadForm({ initialDocuments }: { initialDocuments: DocumentItem[] }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<SplitMode>("akapity");
  const [stage, setStageState] = useState<ImportStage | null>(null);
  const stageRef = useRef<ImportStage | null>(null); // aktualny etap także w obsłudze błędu
  const setStage = (s: ImportStage | null) => {
    stageRef.current = s;
    setStageState(s);
  };
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [documents, setDocuments] = useState(initialDocuments);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [listError, setListError] = useState("");

  async function refreshList() {
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error();
      setDocuments(
        (data.documents as { id: number; title: string; createdAt: string; chunks: number }[]).map((d) => ({
          id: d.id,
          title: d.title,
          version: formatVersion(d.createdAt),
          chunks: d.chunks,
        })),
      );
      setListError("");
    } catch {
      setListError("Nie udało się odświeżyć listy dokumentów. Odśwież stronę.");
    }
  }

  /** Wysyła dokument i czyta postęp (linie JSON) aż do wyniku. */
  async function sendImport(t: string, c: string, replace: boolean): Promise<Result> {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: t, content: c, replace, mode }),
    });
    if (res.status === 401) return { ok: false, message: "Sesja wygasła.", hint: "Odśwież stronę i zaloguj się ponownie." };
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => null);
      return { ok: false, message: data?.message ?? "Serwer odrzucił dokument.", hint: "Popraw dane w formularzu i spróbuj ponownie." };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: Result | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        if ("ok" in msg) result = msg as Result;
        else if (msg.stage) setStage(msg.stage as ImportStage);
      }
      if (done) break;
    }
    return result ?? { ok: false, message: "Połączenie zerwało się w trakcie importu.", hint: "Sprawdź listę poniżej i w razie potrzeby spróbuj ponownie." };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return; // drugi klik w trakcie importu nic nie robi
    const t = title.trim();
    const c = content.trim();
    // Puste pola: komunikat od razu, bez wysyłania na serwer.
    if (!t && !c) return setMessage({ kind: "error", text: "Wpisz tytuł i wklej treść dokumentu." });
    if (!t) return setMessage({ kind: "error", text: "Wpisz tytuł dokumentu." });
    if (!c) return setMessage({ kind: "error", text: "Wklej treść dokumentu." });

    const existing = documents.find((d) => sameTitle(d.title, t));
    let replace = false;
    if (existing) {
      if (!confirmReplace(existing)) return;
      replace = true;
    }

    setBusy(true);
    setMessage(null);
    setStage("split");
    try {
      let result = await sendImport(t, c, replace);
      // Lista mogła być nieaktualna – serwer znalazł dokument o tym tytule.
      if (!result.ok && result.exists) {
        if (!window.confirm(`Dokument „${t}” już jest w bazie.\n\nZastąpić go nową wersją? Stare fragmenty zostaną usunięte.`)) {
          setMessage({ kind: "warning", text: "Nic nie zmieniono – poprzednia wersja została w bazie." });
          return;
        }
        setStage("split");
        result = await sendImport(t, c, true);
      }

      if (!result.ok) {
        const where = result.stage ? `Import nie udał się na etapie: ${STAGE_LABELS[result.stage].name}. ` : "Import nie udał się. ";
        setMessage({ kind: "error", text: where + result.message, hint: result.hint });
        return;
      }

      const parts = [`Zapisano dokument „${result.title}”: ${chunksLabel(result.chunks)}.`];
      if (result.replaced > 0) parts.push("Poprzednia wersja została zastąpiona.");
      if (result.uzupelniono > 0) parts.push(`Uzupełniono też embeddingi ${result.uzupelniono} starszych fragmentów.`);
      if (result.nieUzupelniono > 0)
        parts.push(`Nie udało się uzupełnić ${result.nieUzupelniono} starszych fragmentów – spróbujemy przy następnym imporcie.`);
      if (result.warning) parts.push(result.warning);
      setMessage({ kind: result.warning || result.nieUzupelniono > 0 ? "warning" : "ok", text: parts.join(" ") });
      setTitle("");
      setContent("");
    } catch (err) {
      setMessage({
        kind: "error",
        text: stageRef.current
          ? `Import nie udał się na etapie: ${STAGE_LABELS[stageRef.current].name}.`
          : "Import nie udał się.",
        hint:
          err instanceof TypeError
            ? "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie."
            : "Odśwież stronę, sprawdź listę dokumentów i spróbuj ponownie.",
      });
    } finally {
      setBusy(false);
      setStage(null);
      void refreshList();
    }
  }

  function confirmReplace(d: DocumentItem) {
    return window.confirm(
      `Dokument „${d.title}” już jest w bazie (wersja z ${d.version}, ${chunksLabel(d.chunks)}).\n\n` +
        "Zastąpić go nową wersją? Stare fragmenty zostaną usunięte, zostaną tylko nowe.",
    );
  }

  async function remove(d: DocumentItem) {
    if (!window.confirm(`Usunąć dokument „${d.title}” (${chunksLabel(d.chunks)})?\n\nTego nie da się cofnąć.`)) return;
    setDeleting(d.id);
    setListError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "delete", id: d.id }),
      });
      if (res.status === 401) throw new Error("Sesja wygasła. Odśwież stronę i zaloguj się.");
      const data = await res.json().catch(() => null);
      if (!data?.ok && res.status !== 404) throw new Error(data?.message ?? "Nie udało się usunąć dokumentu.");
      setDocuments((list) => list.filter((x) => x.id !== d.id));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Nie udało się usunąć dokumentu.");
    } finally {
      setDeleting(null);
    }
  }

  const currentIndex = stage ? STAGES.indexOf(stage) : -1;

  return (
    <>
      <form className="card profile-card upload-form" onSubmit={submit} noValidate aria-busy={busy}>
        <label className="upload-label" htmlFor="doc-title">
          Tytuł (nazwa źródła)
        </label>
        <input
          id="doc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          placeholder="np. Cennik pakietów 2026"
          disabled={busy}
        />

        <label className="upload-label" htmlFor="doc-content">
          Treść
        </label>
        <textarea
          id="doc-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CONTENT}
          rows={16}
          placeholder="Wklej tekst dokumentu. Każdy akapit (oddzielony pustą linią) stanie się osobnym fragmentem."
          disabled={busy}
        />
        <fieldset className="upload-mode" disabled={busy}>
          <legend className="upload-label">Sposób dzielenia tekstu</legend>
          <label>
            <input type="radio" name="split-mode" value="akapity" checked={mode === "akapity"} onChange={() => setMode("akapity")} />
            Akapity – każdy akapit (oddzielony pustą linią) to osobny fragment
          </label>
          <label>
            <input type="radio" name="split-mode" value="stale" checked={mode === "stale"} onChange={() => setMode("stale")} />
            Stałe kawałki – po {FIXED_SIZE} znaków z zakładką {FIXED_OVERLAP} znaków
          </label>
        </fieldset>
        <p className="note upload-count">
          {content.length.toLocaleString("pl-PL")} / {MAX_CONTENT.toLocaleString("pl-PL")} znaków
        </p>

        {busy && (
          <ol className="upload-steps" role="status" aria-live="polite">
            {STAGES.map((s, i) => (
              <li key={s} className={i < currentIndex ? "done" : i === currentIndex ? "current" : "pending"}>
                {i < currentIndex ? "✓ " : i === currentIndex ? "⏳ " : "○ "}
                {STAGE_LABELS[s].progress}
              </li>
            ))}
          </ol>
        )}

        {message && (
          <div role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "error" : message.kind === "warning" ? "warning" : "note"}>
            <p style={{ margin: 0 }}>{message.text}</p>
            {message.hint && (
              <p style={{ margin: "4px 0 0" }}>
                <strong>Co zrobić:</strong> {message.hint}
              </p>
            )}
          </div>
        )}

        <div className="profile-footer">
          <button type="submit" disabled={busy}>
            {busy && stage ? STAGE_LABELS[stage].progress : "Dodaj do bazy wiedzy"}
          </button>
          <a href="/">← Wróć do czatu</a>
        </div>
      </form>

      <section className="upload-docs">
        <h3>Dokumenty w bazie wiedzy</h3>
        {listError && (
          <p role="alert" className="error">
            {listError}
          </p>
        )}
        {documents.length === 0 ? (
          <p className="note">Baza wiedzy jest pusta. Dodaj pierwszy dokument powyżej.</p>
        ) : (
          <ul className="history-list">
            {documents.map((d) => (
              <li key={d.id} className="history-row">
                <div className="history-item">
                  <span className="history-title">{d.title}</span>
                  <span className="history-meta">
                    Wersja z {d.version} · {chunksLabel(d.chunks)}
                  </span>
                </div>
                <button
                  type="button"
                  className="button-secondary inline-btn history-delete"
                  onClick={() => remove(d)}
                  disabled={deleting !== null || busy}
                  aria-label={`Usuń dokument ${d.title}`}
                >
                  {deleting === d.id ? "Usuwam…" : "Usuń"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
