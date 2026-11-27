import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ProfileEditor from "@/components/ProfileEditor";
import { loginPath } from "@/lib/authRedirect";
import { getCurrentUser, getUserDb } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/** Profil użytkownika: co agent o mnie pamięta. Dane tylko po sprawdzeniu sesji. */
export default async function ProfilePage() {
  // Najpierw zweryfikowana sesja (serwer): bez logowania nie czytamy niczego z bazy.
  if (!(await getCurrentUser())) redirect(loginPath("/profile"));

  // Własny profil zalogowanej osoby (RLS).
  const db = await getUserDb();
  const persistence = db !== null;
  const profile = persistence ? await loadProfile(db) : null;

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
