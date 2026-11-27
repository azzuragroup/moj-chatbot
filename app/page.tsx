import type { UIMessage } from "ai";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Chat from "@/components/Chat";
import { loginPath } from "@/lib/authRedirect";
import { getCurrentUser, getUserDb } from "@/lib/supabase/server";
import { conversationExists, loadConversation, loadLatestConversation } from "@/lib/chatStore";
import { parseConversationId } from "@/lib/chatPersistence";
import { loadProfile } from "@/lib/profile";
import { WELCOME_MESSAGE_ID, greetingName, needsOnboarding, welcomeText } from "@/lib/profileCore";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Najpierw zweryfikowana sesja (serwer): bez logowania nie czytamy niczego z bazy.
  const user = await getCurrentUser();
  if (!user) redirect(loginPath("/"));

  const params = await searchParams;
  const requested = parseConversationId(typeof params.c === "string" ? params.c : undefined);
  const fresh = params.nowa === "1";
  // Rozmowy i profil czytamy klientem zalogowanej osoby – RLS pokazuje tylko jej dane.
  const db = await getUserDb();
  const persistence = db !== null;

  // /?nowa=1 → pusta rozmowa; /?c=12 → rozmowa nr 12 (z /history); / → ostatnia rozmowa.
  let saved: Awaited<ReturnType<typeof loadConversation>> = null;
  if (persistence && !fresh) {
    if (requested) {
      // Cudzej rozmowy RLS „nie widzi” – tak samo jak usuniętej. Zamiast pustego czatu: komunikat.
      if (!(await conversationExists(db, requested))) return <ConversationNotFound />;
      saved = await loadConversation(db, requested);
    } else {
      saved = await loadLatestConversation(db);
    }
  }

  // Powitanie: imię z profilu zalogowanej osoby, a bez niego część e-maila przed @.
  const profile = persistence ? await loadProfile(db) : null;

  // Pierwsze wejście: w profilu nie ma preferencji → nowa rozmowa zaczyna się od powitania agenta
  // z dwoma pytaniami (rola – i imię, jeśli go nie znamy – oraz kanały i ton). Imię z konta Google
  // trafia do profilu przy logowaniu, więc taka osoba jest witana po imieniu już w pierwszej rozmowie.
  // Odpowiedzi agent zapisuje w profilu, więc przy kolejnych wejściach pytań już nie ma.
  const onboarding = persistence && needsOnboarding(profile);
  const welcome: UIMessage[] =
    onboarding && !saved
      ? [
          {
            id: WELCOME_MESSAGE_ID,
            role: "assistant",
            parts: [{ type: "text", text: welcomeText(greetingName(profile?.name, user.email), Boolean(profile?.name)) }],
          },
        ]
      : [];

  return (
    <Chat
      userName={greetingName(profile?.name, user.email)}
      onboarding={onboarding}
      initialConversationId={saved?.id ?? null}
      initialMessages={saved?.messages ?? welcome}
      persistence={persistence}
    />
  );
}

function ConversationNotFound() {
  return (
    <main className="page page-wide">
      <AppHeader />
      <div className="card not-found" role="alert">
        <h2>Nie znaleziono rozmowy</h2>
        <p>Ta rozmowa nie istnieje, została usunięta albo należy do innego konta.</p>
        <div className="not-found-actions">
          <a className="btn" href="/?nowa=1">
            + Nowa rozmowa
          </a>
          <a className="button-secondary btn" href="/history">
            Historia rozmów
          </a>
        </div>
      </div>
    </main>
  );
}
