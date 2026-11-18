import { cookies } from "next/headers";
import AppHeader from "@/components/AppHeader";
import Login from "@/components/Login";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listConversations } from "@/lib/chatStore";
import { messagesLabel } from "@/lib/chatPersistence";
import HistoryList, { EmptyHistory } from "@/components/HistoryList";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Historia rozmów – jak pasek boczny w ChatGPT. Dane tylko po sprawdzeniu sesji. */
export default async function HistoryPage() {
  // Najpierw sesja: bez logowania nie czytamy niczego z bazy.
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) return <Login />;

  const persistence = isSupabaseConfigured();
  const conversations = persistence ? await listConversations() : null;

  return (
    <main className="page page-wide">
      <AppHeader />
      <div className="trip-head">
        <div>
          <h2 style={{ margin: 0 }}>Historia rozmów</h2>
          <p className="note" style={{ marginTop: 2 }}>Najnowsze na górze. Kliknij rozmowę, żeby do niej wrócić.</p>
        </div>
        <a className="btn history-new" href="/?nowa=1">
          + Nowa rozmowa
        </a>
      </div>

      {!persistence && <p className="warning">Zapis rozmów jest wyłączony – brak konfiguracji bazy na serwerze.</p>}
      {persistence && conversations === null && (
        <p role="alert" className="error">Nie udało się wczytać historii z bazy. Odśwież stronę za chwilę.</p>
      )}
      {conversations && conversations.length === 0 && <EmptyHistory />}
      {conversations && conversations.length > 0 && (
        <HistoryList
          items={conversations.map((c) => ({
            id: c.id,
            title: c.title,
            date: fmtDate(c.createdAt),
            count: messagesLabel(c.messageCount),
          }))}
        />
      )}
    </main>
  );
}
