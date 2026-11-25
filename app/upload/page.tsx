import { cookies } from "next/headers";
import AppHeader from "@/components/AppHeader";
import Login from "@/components/Login";
import UploadForm, { type DocumentItem } from "@/components/UploadForm";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";
import { formatVersion } from "@/lib/chunkingCore";
import { listDocuments } from "@/lib/knowledge";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Baza wiedzy: wklejanie dokumentów i lista dokumentów. Tylko po zalogowaniu. */
export default async function UploadPage() {
  // Najpierw sesja: bez logowania nie czytamy niczego z bazy.
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!hasValidSession(session)) return <Login />;

  const configured = isSupabaseConfigured();
  const docs = configured ? await listDocuments() : null;
  const items: DocumentItem[] = (docs ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    version: formatVersion(d.createdAt),
    chunks: d.chunks,
  }));

  return (
    <main className="page page-wide">
      <AppHeader />
      <h2 style={{ margin: "0 0 4px" }}>Baza wiedzy</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Wklej dokument, np. cennik albo opis produktu. Każdy akapit zostanie zapisany jako osobny fragment.
        Dokument o tym samym tytule zastępuje poprzednią wersję.
      </p>
      {configured ? (
        <>
          {docs === null && <p className="warning">Nie udało się wczytać listy dokumentów. Odśwież stronę za chwilę.</p>}
          <UploadForm initialDocuments={items} />
        </>
      ) : (
        <p className="warning">Baza wiedzy jest wyłączona – brak konfiguracji bazy na serwerze.</p>
      )}
    </main>
  );
}
