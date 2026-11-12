"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { prepareImage, stripOldImages } from "./chatImages";
import { collectSources, toolSequence } from "./toolSequence";
import { MAX_STEPS } from "@/lib/steps";

const MAX_IMAGE_PROMPT = 500;

// Podpowiedzi pasujące do Azzura Group. Bez kolorów i stylu: te dokłada serwer.
const IMAGE_SUGGESTIONS = [
  "Nowoczesny dom jednorodzinny z elewacją z opalanego drewna Dragonwood",
  "Jasne wnętrze biura ze ścianą wykończoną panelami ADO",
  "Wielokondygnacyjny budynek miejski w trakcie budowy, poszycie z płyt BoardeX",
];

type Metadata = { fetchedAt?: string; modelId?: string | null; stoppedAtLimit?: boolean };

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

export default function Chat() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [image, setImage] = useState<FileUIPart | null>(null);
  const [imageError, setImageError] = useState("");
  const [generating, setGenerating] = useState(false);
  // Blokada natychmiastowa: stan Reacta zmienia się dopiero po odświeżeniu,
  // więc szybkie podwójne kliknięcie mogłoby wysłać dwa zlecenia.
  const generatingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ id, messages, body }) => ({
          body: { ...body, mode: "chat", id, messages: stripOldImages(messages) },
        }),
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
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

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Asystent marketingowy</h1>
        <a href="/analiza" style={{ marginLeft: "auto", marginRight: 12 }}>
          Analiza
        </a>
        <a href="/porownanie" style={{ marginRight: 12 }}>
          Porównanie
        </a>
        <button
          type="button"
          className="button-secondary"
          style={{ padding: "6px 12px" }}
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            router.refresh();
          }}
        >
          Wyjdź
        </button>
      </div>

      <p style={{ margin: 0 }}>
        Dzień dobry! Pomogę napisać post, opis produktu, mail albo odpowiedź na zapytanie ofertowe.
      </p>

      <div
        style={{
          // Na starcie niskie okno, które rośnie razem z rozmową.
          minHeight: 140,
          border: "1px solid #d4d4d8",
          borderRadius: 4,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, index) => (
          <div
            key={m.id}
            style={{
              whiteSpace: "pre-wrap",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "var(--azzura-ice)" : "var(--azzura-light)",
              color: m.role === "user" ? "var(--azzura-ice-text)" : "var(--azzura-dark)",
              padding: "8px 12px",
              borderRadius: 4,
              maxWidth: "85%",
            }}
          >
            <ToolBadges message={m} />
            {m.parts.map((p, i) => {
              if (p.type === "text") return <span key={i}>{p.text}</span>;
              if (p.type === "file" && p.mediaType.startsWith("image/") && m.role === "user") {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p.url}
                    alt="Wysłane zdjęcie"
                    style={{ display: "block", maxWidth: 160, maxHeight: 160, borderRadius: 6, marginTop: 6 }}
                  />
                );
              }
              if (p.type === "tool-generujObraz") {
                if (p.state === "input-streaming" || p.state === "input-available") {
                  return <div key={i} style={{ color: "#666" }}>Generuję obraz…</div>;
                }
                if (p.state === "output-error") {
                  return <div key={i} style={{ color: "#b00020" }}>Błąd: nie udało się wygenerować obrazu.</div>;
                }
                if (p.state === "output-available") {
                  return <GeneratedImage key={i} output={p.output as ImageToolOutput} />;
                }
              }
              return null;
            })}
            <Sources message={m} />
            <ModelLine message={m} previous={messages[index - 1]} />
            <StepLimitNotice message={m} />
          </div>
        ))}
        {status === "submitted" && <div style={{ color: "#666" }}>Chatbot myśli…</div>}
              </div>

      {error && (
        <div role="alert" style={{ color: "#b00020" }}>
          Błąd: {error.message}
        </div>
      )}
      {imageError && (
        <div role="alert" style={{ color: "#b00020" }}>
          Błąd: {imageError}
        </div>
      )}

      {image && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="Wybrane zdjęcie" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }} />
          <span style={{ fontSize: 14 }}>{image.filename}</span>
          <button type="button" onClick={clearImage}>
            Usuń
          </button>
        </div>
      )}

      <form
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
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Napisz wiadomość..."
          style={{ flex: "1 1 240px", padding: 10, fontSize: 16 }}
        />
        <button type="submit" disabled={!canSend} style={{ padding: "10px 16px", fontSize: 16 }}>
          Wyślij
        </button>
        <label
          style={{
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--azzura-navy)",
            border: "1px solid var(--azzura-navy)",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.5 : 1,
          }}
        >
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
          style={{ padding: "10px 12px", fontSize: 14 }}
        >
          {generating ? "Generuję obraz…" : "Wygeneruj obraz"}
        </button>
      </form>

      {text.length > MAX_IMAGE_PROMPT && (
        <div role="alert" style={{ color: "#b00020", fontSize: 14 }}>
          Opis obrazu może mieć najwyżej {MAX_IMAGE_PROMPT} znaków (teraz: {text.length}).
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#666" }}>Podpowiedzi obrazu:</span>
        {IMAGE_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => setInput(s)}
            style={{ fontSize: 13, fontWeight: 400, padding: "4px 10px", border: "1px solid var(--azzura-ice)", background: "var(--azzura-ice)", color: "var(--azzura-ice-text)", cursor: busy ? "default" : "pointer" }}
          >
            {s}
          </button>
        ))}
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
    <div style={{ color: "#666", fontSize: 12, marginTop: 6, whiteSpace: "normal" }}>
      model: {meta.modelId || "nie podany w odpowiedzi API"}
    </div>
  );
}

/** Obraz z narzędzia generujObraz, z przyciskiem „Pobierz” i modelem z API. */
function GeneratedImage({ output }: { output: ImageToolOutput }) {
  if (!output.ok) {
    return <div style={{ color: "#b00020", whiteSpace: "normal" }}>Błąd: {output.message}</div>;
  }
  if (!output.url) {
    // Obraz z wcześniejszej części rozmowy, którego dane nie są już przechowywane.
    return <div style={{ color: "#666" }}>[wygenerowany obraz]</div>;
  }
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={output.url}
        alt="Wygenerowany obraz"
        style={{ display: "block", maxWidth: "100%", maxHeight: 480, borderRadius: 6, marginTop: 6 }}
      />
      <a
        href={output.url}
        download={`studio-nova-obraz.${output.mediaType.split("/")[1] || "png"}`}
        style={{ display: "inline-block", marginTop: 6, fontSize: 14 }}
      >
        Pobierz
      </a>
      <div style={{ color: "#666", fontSize: 12, marginTop: 6, whiteSpace: "normal" }}>
        model: {output.modelId || "nie podany w odpowiedzi API"}
        {!output.modelId && output.provider && ` (dostawca z API: ${output.provider})`} · styl:{" "}
        {output.brand}
      </div>
    </div>
  );
}

function Sources({ message }: { message: UIMessage }) {
  const { sources } = collectSources(message.parts);
  if (sources.length === 0) return null;

  const fetchedAt = (message.metadata as { fetchedAt?: string } | undefined)?.fetchedAt;

  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #ccc", whiteSpace: "normal" }}>
      <strong>Źródła</strong>
      <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title || s.url}
            </a>
          </li>
        ))}
      </ul>
      {fetchedAt && (
        <div style={{ color: "#666", fontSize: 13 }}>
          pobrano: {new Date(fetchedAt).toLocaleString("pl-PL")}
        </div>
      )}
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  web_search: "🔎 wyszukiwanie",
  aktualnyCzas: "🕒 aktualnyCzas",
  pogoda: "🌤️ pogoda",
  generujObraz: "🎨 obraz",
};

/** Etykiety narzędzi użytych w odpowiedzi. Bez narzędzi nic nie pokazuje. */
function ToolBadges({ message }: { message: UIMessage }) {
  if (message.role !== "assistant") return null;
  const sequence = toolSequence(message.parts);
  if (sequence.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6, whiteSpace: "normal" }}>
      {sequence.map((name, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ color: "#999", fontSize: 12 }}>→</span>}
          <span style={{ fontSize: 12, background: "var(--azzura-navy)", color: "#ffffff", padding: "2px 8px" }}>
            {i + 1}. {TOOL_LABELS[name] ?? `🛠 ${name}`}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Komunikat, gdy agent zatrzymał się na limicie kroków. */
function StepLimitNotice({ message }: { message: UIMessage }) {
  if (message.role !== "assistant") return null;
  const meta = (message.metadata ?? {}) as Metadata;
  if (!meta.stoppedAtLimit) return null;
  return (
    <div style={{ color: "#8a5300", fontSize: 14, marginTop: 6, whiteSpace: "normal" }}>
      Przerwałem po {MAX_STEPS} krokach. Zadaj pytanie prościej albo podziel je na części.
    </div>
  );
}
