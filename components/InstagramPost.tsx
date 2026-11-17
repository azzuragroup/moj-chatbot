"use client";

import { useState } from "react";

type Grafika =
  | { ok: true; url: string; mediaType: string; modelId: string | null; provider?: string | null; brand: string }
  | { ok: false; message: string };

export type InstagramPostOutput =
  | {
      ok: true;
      produkt: string;
      link: string;
      opis: string;
      hashtagi: string[];
      grafika: Grafika;
      szerokosc: number;
      wysokosc: number;
    }
  | { ok: false; message: string };

/** Zapisuje grafikę dokładnie w wymiarze posta (np. 1080×1350), kadrując środek. */
async function downloadResized(url: string, width: number, height: number) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Nie udało się przygotować grafiki.");
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Nie udało się zapisać grafiki.");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `azzura-instagram-${width}x${height}.png`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Szkic posta na Instagram. Niczego nie publikuje. */
export default function InstagramPost({ output }: { output: InstagramPostOutput }) {
  const [info, setInfo] = useState("");

  if (!output.ok) {
    return <div style={{ color: "var(--danger)", whiteSpace: "normal" }}>Błąd: {output.message}</div>;
  }
  const { grafika } = output;

  return (
    <div style={{ marginTop: 6, whiteSpace: "normal" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
        Szkic posta na Instagram – niczego nie publikujemy automatycznie.
      </div>
      {grafika.ok && grafika.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={grafika.url}
          alt={`Grafika do posta: ${output.produkt}`}
          style={{ display: "block", width: "100%", maxWidth: 320, aspectRatio: "4 / 5", objectFit: "cover" }}
        />
      ) : grafika.ok ? (
        <div style={{ color: "var(--muted)" }}>[grafika z wcześniejszej części rozmowy]</div>
      ) : (
        <div style={{ color: "var(--danger)" }}>Grafika: {grafika.message}</div>
      )}
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "inherit",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: 10,
          marginTop: 8,
        }}
      >
        {output.opis}
      </pre>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        {output.opis.length} / 2200 znaków · {output.hashtagi.length} hashtagów
        {grafika.ok && ` · grafika ${output.szerokosc}×${output.wysokosc} · model: ${grafika.modelId || "nie podany w odpowiedzi API"}`}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {grafika.ok && grafika.url && (
          <button
            type="button"
            style={{ padding: "6px 12px" }}
            onClick={async () => {
              try {
                await downloadResized(grafika.url, output.szerokosc, output.wysokosc);
                setInfo("Grafika pobrana.");
              } catch (e) {
                setInfo(e instanceof Error ? e.message : "Nie udało się pobrać grafiki.");
              }
            }}
          >
            Pobierz grafikę
          </button>
        )}
        <button
          type="button"
          className="button-secondary"
          style={{ padding: "6px 12px" }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(output.opis);
              setInfo("Opis skopiowany.");
            } catch {
              setInfo("Nie udało się skopiować. Zaznacz opis i skopiuj ręcznie.");
            }
          }}
        >
          Kopiuj opis
        </button>
        {info && <span style={{ fontSize: 13, alignSelf: "center" }}>{info}</span>}
      </div>
    </div>
  );
}
