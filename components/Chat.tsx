"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { prepareImage, stripOldImages } from "./chatImages";
import { collectSources, stepSequence } from "./toolSequence";
import { knowledgeSources, percent } from "./knowledgeSources";
import { splitLinks } from "./links";
import InstagramPost, { type InstagramPostOutput } from "./InstagramPost";
import AppHeader from "./AppHeader";
import MarkdownText from "./MarkdownText";
import { MAX_STEPS } from "@/lib/steps";
import { MAX_TOOL_CALLS, TASK_TIMEOUT_MS } from "@/lib/guard";

const MAX_IMAGE_PROMPT = 500;

// Podpowiedzi pasujące do Azzura Group. Bez kolorów i stylu: te dokłada serwer.
const IMAGE_SUGGESTIONS = [
  "Nowoczesny dom jednorodzinny z elewacją z opalanego drewna Dragonwood",
  "Jasne wnętrze biura ze ścianą wykończoną panelami ADO",
  "Wielokondygnacyjny budynek miejski w trakcie budowy, poszycie z płyt BoardeX",
];

type Metadata = {
  fetchedAt?: string;
  modelId?: string | null;
  stoppedAtLimit?: boolean;
  stopReason?: "kroki" | "narzedzia" | "czas";
  maxSteps?: number;
  stats?: { kroki: number; wywolaniaNarzedzi: number; czasMs: number };
};

type ImageToolOutput =
  | {
      ok: true;
      url: string;
      mediaType: string;
      modelId: string | null;
      provider?: string | null;
      brand: string;
    }
  | { ok: false; message: string };

type ChatProps = {
  /** Numer zapisanej rozmowy wczytanej z bazy (null = nowa rozmowa). */
  initialConversationId?: number | null;
  /** Wiadomości zapisanej rozmowy – pokazywane po odświeżeniu strony. */
  initialMessages?: UIMessage[];
  /** Czy zapis rozmów w bazie jest skonfigurowany na serwerze. */
  persistence?: boolean;
  /** Komunikat z serwera, np. że rozmowy z adresu już nie ma. */
  notice?: string;
  /** Imię do powitania „Cześć, <imię>!” (z profilu albo część e-maila przed @). */
  userName?: string | null;
  /**
   * Pierwsze wejście (pusty profil): rozmowa zaczyna się od powitania z pytaniami.
   * „Nowa rozmowa” przeładowuje wtedy stronę – serwer sprawdza, czy profil nadal jest pusty.
   */
  onboarding?: boolean;
};

/** Adres w przeglądarce pokazuje bieżącą rozmowę – F5 wraca do tej samej. */
function showConversationInUrl(id: number | null) {
  try {
    window.history.replaceState(null, "", id === null ? "/?nowa=1" : `/?c=${id}`);
  } catch {
    // bez zmiany adresu czat działa dalej
  }
}

export default function Chat({
  initialConversationId = null,
  initialMessages = [],
  persistence = false,
  notice = "",
  userName = null,
  onboarding = false,
}: ChatProps) {
  const [input, setInput] = useState("");
  const [image, setImage] = useState<FileUIPart | null>(null);
  const [imageError, setImageError] = useState("");
  const [generating, setGenerating] = useState(false);
  // Blokada natychmiastowa: stan Reacta zmienia się dopiero po odświeżeniu,
  // więc szybkie podwójne kliknięcie mogłoby wysłać dwa zlecenia.
  const generatingRef = useRef(false);
  // Numer rozmowy w bazie. Ref, bo transport czyta go w chwili wysyłania.
  const conversationIdRef = useRef<number | null>(initialConversationId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ id, messages, body }) => ({
          body: {
            ...body,
            mode: "chat",
            id,
            // Do której rozmowy w bazie dopisać wiadomość (null = utwórz nową).
            conversationId: conversationIdRef.current,
            messages: stripOldImages(messages),
          },
        }),
      }),
    [],
  );
  const { messages, sendMessage, setMessages, status, error, stop } = useChat({
    messages: initialMessages,
    transport,
    // Serwer podaje numer rozmowy w metadanych odpowiedzi – kolejne pytania dopisują się do niej.
    onFinish: ({ message }) => {
      const id = (message.metadata as { conversationId?: number | null } | undefined)?.conversationId;
      if (typeof id === "number" && id !== conversationIdRef.current) {
        conversationIdRef.current = id;
        showConversationInUrl(id);
      }
    },
  });

  // „Nowa rozmowa”: pusty czat; stara rozmowa zostaje w bazie.
  function newConversation() {
    if (status === "submitted" || status === "streaming") stop();
    if (onboarding) {
      // Po odpowiedziach na powitanie profil już nie jest pusty – nie pokazujemy pytań drugi raz.
      window.location.assign("/?nowa=1");
      return;
    }
    conversationIdRef.current = null;
    showConversationInUrl(null);
    setMessages([]);
    setStoppedIds(new Set());
    setInput("");
  }

  // Wiadomości przerwane przyciskiem Stop (ich część zostaje w rozmowie).
  const [stoppedIds, setStoppedIds] = useState<Set<string>>(() => new Set());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  function stopAgent() {
    stop();
    // Ostatnia wiadomość w chwili kliknięcia: częściowa odpowiedź agenta
    // albo – gdy agent nic jeszcze nie napisał – pytanie użytkownika.
    const last = messagesRef.current[messagesRef.current.length - 1];
    if (last) setStoppedIds((prev) => new Set(prev).add(last.id));
  }
  const busy = status === "submitted" || status === "streaming" || generating;
  const text = input.trim();
  const canSend = (text.length > 0 || image !== null) && !busy;
  const canGenerate = text.length > 0 && text.length <= MAX_IMAGE_PROMPT && !busy;

  function clearImage() {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onPickImage(file: File | undefined) {
    setImageError("");
    if (!file) return;
    try {
      setImage(await prepareImage(file));
    } catch (e) {
      clearImage();
      setImageError(e instanceof Error ? e.message : "Nie udało się dodać zdjęcia.");
    }
  }

  // Przycisk wysyła prośbę do czatu, a model używa narzędzia generujObraz.
  async function generate() {
    if (!canGenerate || generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setImageError("");
    setInput("");
    try {
      await sendMessage({ text: `Wygeneruj obraz: ${text}` });
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }

  const agentWorking = status === "submitted" || status === "streaming";

  // Panel rozmowy przewija się sam do najnowszej wiadomości.
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [messages, agentWorking]);

  return (
    <main className="chat-page">
      <AppHeader />

      <section className="chat-messages chat-panel" aria-live="polite" ref={panelRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            {notice && <p className="warning" style={{ marginTop: 0 }}>{notice}</p>}
            {userName ? <>Cześć, {userName}! 🔵 </> : <>Cześć! </>}
            W czym dziś pomogę – post, opis produktu, mail czy odpowiedź na zapytanie ofertowe?
          </div>
        )}
        {messages.map((m, index) => (
          <Fragment key={m.id}>
          <div className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}>
            {m.role === "assistant" && <div className="bubble-label">Asystent</div>}
            <ToolBadges message={m} />
            <StepLimitNotice message={m} />
            {m.parts.map((p, i) => {
              if (p.type === "text") {
                // Odpowiedzi agenta z formatowaniem markdown; tekst użytkownika bez zmian.
                return m.role === "assistant" ? (
                  <MarkdownText key={i} text={p.text} />
                ) : (
                  <LinkedText key={i} text={p.text} />
                );
              }
              if (p.type === "file" && p.mediaType.startsWith("image/") && m.role === "user") {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p.url}
                    alt="Wysłane zdjęcie"
                    style={{ display: "block", maxWidth: 180, maxHeight: 180, marginTop: 8 }}
                  />
                );
              }
              if (p.type === "tool-postInstagram") {
                if (p.state === "input-streaming" || p.state === "input-available") {
                  return <div key={i} className="note">Przygotowuję post na Instagram…</div>;
                }
                if (p.state === "output-error") {
                  return <div key={i} className="error">Błąd: nie udało się przygotować posta.</div>;
                }
                if (p.state === "output-available") {
                  return <InstagramPost key={i} output={p.output as InstagramPostOutput} />;
                }
              }
              if (p.type === "tool-generujObraz") {
                if (p.state === "input-streaming" || p.state === "input-available") {
                  return <div key={i} className="note">Generuję obraz…</div>;
                }
                if (p.state === "output-error") {
                  return <div key={i} className="error">Błąd: nie udało się wygenerować obrazu.</div>;
                }
                if (p.state === "output-available") {
                  return <GeneratedImage key={i} output={p.output as ImageToolOutput} />;
                }
              }
              return null;
            })}
            <Sources message={m} />
            <KnowledgeSourceList message={m} />
            <ModelLine message={m} previous={messages[index - 1]} />
            <StatsLine message={m} />
            {m.role === "assistant" && stoppedIds.has(m.id) && (
              <div className="stopped-note">⏹ Przerwane przez użytkownika</div>
            )}
          </div>
          {m.role === "user" && stoppedIds.has(m.id) && (
            <div className="bubble bubble-assistant">
              <div className="stopped-note" style={{ marginTop: 0 }}>
                ⏹ Przerwane przez użytkownika – agent nie zdążył odpowiedzieć.
              </div>
            </div>
          )}
          </Fragment>
        ))}
        {agentWorking && (
          <div className="typing" role="status">
            <span className="typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Agent pisze…
          </div>
        )}
        {error && (
          <div role="alert" className="error">
            Błąd: {error.message}
          </div>
        )}
      </section>

      <div className="composer">
        {imageError && (
          <div role="alert" className="error">
            Błąd: {imageError}
          </div>
        )}
        {text.length > MAX_IMAGE_PROMPT && (
          <div role="alert" className="error" style={{ fontSize: 14 }}>
            Opis obrazu może mieć najwyżej {MAX_IMAGE_PROMPT} znaków (teraz: {text.length}).
          </div>
        )}

        {image && (
          <div className="attachment">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="Wybrane zdjęcie" />
            <span>{image.filename}</span>
            <button type="button" className="button-secondary" onClick={clearImage}>
              Usuń
            </button>
          </div>
        )}

        <div className="composer-top">
          <label className="composer-label" htmlFor="wiadomosc">
            Wiadomość
          </label>
          <div className="composer-links">
            <a className="button-secondary inline-btn" href="/upload">
              Baza wiedzy
            </a>
            <button
              type="button"
              className="button-secondary inline-btn"
              onClick={newConversation}
              disabled={messages.length === 0}
            >
              + Nowa rozmowa
            </button>
          </div>
        </div>
        <form
          className="composer-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSend) return;
            sendMessage({
              text: text || "Co jest na tym zdjęciu?",
              files: image ? [image] : undefined,
            });
            setInput("");
            clearImage();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            id="wiadomosc"
            placeholder="Napisz wiadomość…"
          />
          {agentWorking ? (
            // Stop widoczny tylko podczas pracy agenta – zastępuje „Wyślij”.
            <button type="button" className="stop-button" onClick={stopAgent} aria-label="Zatrzymaj agenta">
              ■ Stop
            </button>
          ) : (
            <button type="submit" disabled={!canSend}>
              Wyślij
            </button>
          )}
        </form>

        <div className="composer-actions">
          <label className="btn" aria-disabled={busy}>
            Dodaj zdjęcie
            <input
              ref={fileInputRef}
              type="file"
              disabled={busy}
              onChange={(e) => onPickImage(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            title={text.length > MAX_IMAGE_PROMPT ? `Opis może mieć najwyżej ${MAX_IMAGE_PROMPT} znaków.` : undefined}
            className="button-secondary"
          >
            {generating ? "Generuję obraz…" : "Wygeneruj obraz"}
          </button>
        </div>

        <div className="suggestions" aria-label="Podpowiedzi obrazu">
          {IMAGE_SUGGESTIONS.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => setInput(s)}>
              {s}
            </button>
          ))}
        </div>

        <p className="composer-hint">
          {persistence
            ? "Rozmowy zapisują się automatycznie. "
            : "Zapis rozmów wyłączony (brak konfiguracji bazy). "}
          Zdjęcie: JPG, PNG lub WebP, do 4 MB · Opis obrazu: maks. {MAX_IMAGE_PROMPT} znaków ·
          Asystent przygotowuje szkice – sprawdź je przed wysłaniem.
        </p>
      </div>
    </main>
  );
}

/** Model z odpowiedzi API: pod wygenerowanym obrazem i pod odpowiedzią o zdjęciu. */
function ModelLine({ message, previous }: { message: UIMessage; previous?: UIMessage }) {
  if (message.role !== "assistant") return null;
  const meta = (message.metadata ?? {}) as Metadata;
  const aboutPhoto =
    previous?.role === "user" && previous.parts.some((p) => p.type === "file");
  if (!aboutPhoto || meta.modelId === undefined) return null;
  return (
    <div className="note">model: {meta.modelId || "nie podany w odpowiedzi API"}</div>
  );
}

/** Obraz z narzędzia generujObraz, z przyciskiem „Pobierz” i modelem z API. */
function GeneratedImage({ output }: { output: ImageToolOutput }) {
  if (!output.ok) {
    return <div className="error">Błąd: {output.message}</div>;
  }
  if (!output.url) {
    // Obraz z wcześniejszej części rozmowy, którego dane nie są już przechowywane.
    return <div className="note">[wygenerowany obraz]</div>;
  }
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={output.url}
        alt="Wygenerowany obraz"
        style={{ display: "block", maxWidth: "100%", maxHeight: 480, marginTop: 8 }}
      />
      <a
        href={output.url}
        download={`azzura-obraz.${output.mediaType.split("/")[1] || "png"}`}
        className="btn"
        style={{ marginTop: 10, minHeight: 36, whiteSpace: "normal" }}
      >
        Pobierz
      </a>
      <div className="note">
        model: {output.modelId || "nie podany w odpowiedzi API"}
        {!output.modelId && output.provider && ` (dostawca z API: ${output.provider})`} · styl:{" "}
        {output.brand}
      </div>
    </div>
  );
}

/** Nazwa strony z adresu; przy uszkodzonym adresie zwraca sam adres. */
function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function Sources({ message }: { message: UIMessage }) {
  const { sources } = collectSources(message.parts);
  if (sources.length === 0) return null;

  const fetchedAt = (message.metadata as { fetchedAt?: string } | undefined)?.fetchedAt;

  return (
    <div className="sources">
      <div className="sources-title">Źródła</div>
      <div className="badges">
        {sources.map((s) => (
          <a key={s.url} className="badge" href={s.url} target="_blank" rel="noopener noreferrer">
            🔗 {s.title || hostOf(s.url)}
          </a>
        ))}
      </div>
      {fetchedAt && <div className="note">pobrano: {new Date(fetchedAt).toLocaleString("pl-PL")}</div>}
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  web_search: "🔎 wyszukiwanie",
  aktualnyCzas: "🕒 czas",
  czas: "🕒 czas",
  pogoda: "🌤️ pogoda",
  waluty: "💱 waluty",
  swieta: "📅 święta",
  wikipedia: "📚 Wikipedia",
  kalkulator: "🧮 kalkulator",
  notatki: "📝 notatki",
  sprawdzFirme: "🔍 sprawdzFirme",
  zapiszProfil: "🧠 pamięć",
  searchKnowledge: "📚 baza wiedzy",
  diagnostyka: "🩺 diagnostyka",
  generujObraz: "🎨 obraz",
  katalogProduktow: "📦 katalog",
  postInstagram: "📸 Instagram",
};

/** Źródła z bazy wiedzy: tytuł, podobieństwo i rozwijany dokładny tekst fragmentu. */
function KnowledgeSourceList({ message }: { message: UIMessage }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  if (message.role !== "assistant") return null;
  const sources = knowledgeSources(message.parts);
  if (sources.length === 0) return null;
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="kb-sources">
      <div className="kb-sources-title">📚 Źródła z bazy wiedzy</div>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            <div className="kb-source-row">
              <span className="kb-source-name">{s.title}</span>
              <span className="kb-source-score" title="Podobieństwo fragmentu do pytania">
                {percent(s.similarity)}
              </span>
              <button
                type="button"
                className="button-secondary inline-btn"
                aria-expanded={open.has(i)}
                aria-controls={`${message.id}-kb-${i}`}
                onClick={() => toggle(i)}
              >
                {open.has(i) ? "Ukryj fragment" : "Pokaż fragment"}
              </button>
            </div>
            {open.has(i) && (
              <blockquote id={`${message.id}-kb-${i}`} className="kb-source-text">
                {s.content}
              </blockquote>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Etykiety narzędzi użytych w odpowiedzi. Bez narzędzi nic nie pokazuje. */
function ToolBadges({ message }: { message: UIMessage }) {
  if (message.role !== "assistant") return null;
  const steps = stepSequence(message.parts);
  if (steps.length === 0) return null;
  const label = (name: string) => TOOL_LABELS[name] ?? `🛠 ${name}`;

  return (
    <div className="badges" aria-label="Kroki agenta">
      <span className="badges-title">Kroki:</span>
      {steps.map((s, i) => (
        <span key={s.step} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span className="badge-arrow">→</span>}
          <span className="badge">
            {s.step}. {s.tools.map(label).join(" + ")}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Mała linijka pod odpowiedzią: liczba kroków, wywołań narzędzi i czas. */
function StatsLine({ message }: { message: UIMessage }) {
  if (message.role !== "assistant") return null;
  const stats = ((message.metadata ?? {}) as Metadata).stats;
  if (!stats) return null;
  const seconds = (stats.czasMs / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 });
  return (
    <div className="stats-line">
      Kroki: {stats.kroki} · Wywołania narzędzi: {stats.wywolaniaNarzedzi} · Czas: {seconds} s
    </div>
  );
}

/** Komunikat, gdy agent zatrzymał się na limicie kroków, narzędzi albo czasu. */
function StepLimitNotice({ message }: { message: UIMessage }) {
  if (message.role !== "assistant") return null;
  const meta = (message.metadata ?? {}) as Metadata;
  if (!meta.stoppedAtLimit) return null;
  const steps = meta.maxSteps ?? MAX_STEPS;
  const headline =
    meta.stopReason === "narzedzia"
      ? `Zatrzymałem się po ${MAX_TOOL_CALLS} wywołaniach narzędzi.`
      : meta.stopReason === "czas"
        ? `Zatrzymałem się, bo zadanie trwało blisko ${TASK_TIMEOUT_MS / 1000} sekund.`
        : `Zatrzymałem się po ${steps} krokach.`;
  const hasText = message.parts.some((p) => p.type === "text" && p.text.trim().length > 0);
  const checked = stepSequence(message.parts)
    .flatMap((s) => s.tools)
    .filter((name, i, all) => all.indexOf(name) === i)
    .map((name) => TOOL_LABELS[name] ?? name);
  return (
    <div className="warning limit-notice" role="status">
      <strong>{headline}</strong>{" "}
      {hasText
        ? "Poniżej to, co udało się ustalić. Resztę zadaj w osobnym pytaniu albo podziel zadanie na części."
        : `Nie zdążyłem napisać podsumowania. Sprawdziłem: ${checked.join(", ") || "nic"}. Zadaj pytanie w częściach.`}
    </div>
  );
}

/** Tekst odpowiedzi z klikalnymi linkami http(s), także w formacie [opis](link). */
function LinkedText({ text }: { text: string }) {
  return (
    <span>
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer">
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
