import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { loginErrorPath, safeNextPath } from "@/lib/authRedirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Link z e-maila potwierdzającego konto (wzorzec z dokumentacji Supabase, PKCE).
 * Obsługuje oba rodzaje linków: ?token_hash=…&type=… (własny szablon e-maila)
 * oraz ?code=… (domyślny szablon). Po sukcesie sesja trafia do ciasteczek i wracamy
 * na stronę z ?next=… – tylko adres wewnątrz aplikacji (safeNextPath), inaczej do czatu.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  if (supabase) {
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) redirect(next);
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) redirect(next);
    }
  }
  redirect(loginErrorPath(next, "link"));
}
