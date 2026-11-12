import type { FileUIPart, UIMessage } from "ai";

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 1600;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nie udało się odczytać zdjęcia."));
    img.src = url;
  });
}

/**
 * Sprawdza zdjęcie i zmniejsza je przed wysłaniem (do 1600 px, JPEG),
 * żeby zapytanie zmieściło się w limicie rozmiaru na Vercel (ok. 4,5 MB).
 */
export async function prepareImage(file: File): Promise<FileUIPart> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Dozwolone są tylko zdjęcia JPG, PNG i WEBP.");
  }
  if (file.size > MAX_FILE_BYTES) throw new Error("Zdjęcie jest większe niż 4 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Nie udało się przygotować zdjęcia.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      type: "file",
      mediaType: "image/jpeg",
      filename: file.name,
      url: canvas.toDataURL("image/jpeg", 0.85),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Do serwera wysyłamy zdjęcia tylko z ostatniej wiadomości użytkownika.
 * Starsze zdjęcia i obrazy wygenerowane w rozmowie zastępujemy krótką notatką,
 * żeby każde kolejne zapytanie nie rosło o kolejne megabajty.
 */
export function stripOldImages(messages: UIMessage[]): UIMessage[] {
  const lastUser = messages.findLastIndex((m) => m.role === "user");
  return messages.map((m, i) => {
    m = stripGeneratedImageData(m);
    const keep = i === lastUser && m.role === "user";
    if (keep || !m.parts.some((p) => p.type === "file")) return m;
    const note = m.role === "user" ? "[wcześniej wysłane zdjęcie]" : "[wygenerowany obraz]";
    return {
      ...m,
      parts: [...m.parts.filter((p) => p.type !== "file"), { type: "text", text: note }],
    };
  });
}

/**
 * Obrazy z narzędzia generujObraz nie wracają na serwer: model i tak widzi
 * tylko tekst „obraz wygenerowany”, więc usuwamy dane pliku z wyniku narzędzia.
 */
function stripGeneratedImageData(m: UIMessage): UIMessage {
  if (!m.parts.some((p) => p.type === "tool-generujObraz")) return m;
  return {
    ...m,
    parts: m.parts.map((p) =>
      p.type === "tool-generujObraz" &&
      p.state === "output-available" &&
      p.output &&
      typeof p.output === "object" &&
      "url" in p.output
        ? { ...p, output: { ...(p.output as object), url: "" } }
        : p,
    ) as UIMessage["parts"],
  };
}
