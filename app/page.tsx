import { cookies } from "next/headers";
import Chat from "@/components/Chat";
import Login from "@/components/Login";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { conversationExists, loadConversation, loadLatestConversation } from "@/lib/chatStore";
import { parseConversationId } from "@/lib/chatPersistence";
import { loadProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Najpierw sesja: bez logowania nie czytamy niczego z bazy.
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) return <Login />;

  const params = await searchParams;
  const requested = parseConversationId(typeof params.c === "string" ? params.c : undefined);
  const fresh = params.nowa === "1";
  const persistence = isSupabaseConfigured();

  // /?nowa=1 → pusta rozmowa; /?c=12 → rozmowa nr 12 (z /history); / → ostatnia rozmowa.
  let saved: Awaited<ReturnType<typeof loadConversation>> = null;
  let notice = "";
  if (persistence && !fresh) {
    if (requested) {
      if (await conversationExists(requested)) saved = await loadConversation(requested);
      else notice = "Nie znaleziono tej rozmowy – mogła zostać usunięta. Zaczynasz nową.";
    } else {
      saved = await loadLatestConversation();
    }
  }

  // Imię z profilu do powitania w nowej rozmowie (bez wywołania modelu).
  const profile = persistence ? await loadProfile() : null;

  return (
    <Chat
      userName={profile?.name ?? null}
      initialConversationId={saved?.id ?? null}
      initialMessages={saved?.messages ?? []}
      persistence={persistence}
      notice={notice}
    />
  );
}
