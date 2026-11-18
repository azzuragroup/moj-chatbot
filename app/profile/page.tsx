import { cookies } from "next/headers";
import AppHeader from "@/components/AppHeader";
import Login from "@/components/Login";
import ProfileEditor from "@/components/ProfileEditor";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { loadProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/** Profil użytkownika: co agent o mnie pamięta. Dane tylko po sprawdzeniu sesji. */
export default async function ProfilePage() {
  // Najpierw sesja: bez logowania nie czytamy niczego z bazy.
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) return <Login />;

  const persistence = isSupabaseConfigured();
  const profile = persistence ? await loadProfile() : null;

  return (
    <main className="page page-wide">
      <AppHeader />
      <h2 style={{ margin: "0 0 4px" }}>Profil</h2>
      <p className="note" style={{ marginTop: 0 }}>
        To agent o Tobie pamięta. Wszystko możesz poprawić albo usunąć. Hasła i dane wrażliwe nigdy nie są zapisywane.
      </p>
      {persistence ? (
        <ProfileEditor initialName={profile?.name ?? ""} initialPreferences={profile?.preferences ?? {}} />
      ) : (
        <p className="warning">Profil jest wyłączony – brak konfiguracji bazy na serwerze.</p>
      )}
    </main>
  );
}
