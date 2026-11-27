import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { loginErrorPath, oauthErrorReason, safeNextPath } from "@/lib/authRedirect";
import { fillProfileNameFromAccount } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { displayFromMetadata } from "@/lib/userDisplay";

/**
 * Powrót z Google (Supabase Auth, PKCE): wymiana kodu na sesję i przejście do czatu
 * albo na stronę z ?next= (tylko ścieżka wewnątrz aplikacji – safeNextPath).
 * Przekierowujemy na ścieżki względne, więc nie ufamy nagłówkom Host/X-Forwarded-Host.
 *
 * Anulowanie u Google wraca jako ?error=access_denied, inne błędy jako ?error=…
 * – wtedy wracamy na /login z komunikatem po polsku.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    console.info("[logowanie Google] powrót z błędem", oauthError, searchParams.get("error_code") ?? "");
    redirect(loginErrorPath(next, oauthErrorReason(searchParams) ?? "google"));
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Imię z konta Google do profilu (tylko gdy profil nie ma imienia) – agent wita po imieniu
        // już w pierwszej rozmowie. Dane konta pochodzą prosto z serwera Supabase (nie z ciasteczka),
        // a zapis idzie klientem z nową sesją tej osoby, więc RLS pozwala zmienić tylko jej profil.
        try {
          const saved = await fillProfileNameFromAccount(supabase, displayFromMetadata(data.user?.user_metadata).name);
          console.info("[logowanie Google] imię z konta zapisane w profilu:", saved ? "tak" : "nie (już było albo brak)");
        } catch {
          console.error("[logowanie Google] nie udało się zapisać imienia w profilu");
        }
        redirect(next);
      }
      console.error("[logowanie Google] wymiana kodu nie powiodła się", error.code ?? "", error.status ?? "");
    }
  }
  redirect(loginErrorPath(next, "google"));
}
