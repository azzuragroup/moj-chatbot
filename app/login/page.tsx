import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import LoginForm from "@/components/LoginForm";
import { loginErrorMessage } from "@/lib/authMessages";
import { safeNextPath } from "@/lib/authRedirect";
import { authEnv, getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Logowanie i zakładanie konta. Po zalogowaniu wracamy na stronę z ?next=…
 * (tylko adresy wewnątrz aplikacji), a bez niej – do czatu.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="login-page">
      <AppHeader />
      {authEnv() ? (
        <LoginForm next={next} initialError={loginErrorMessage(params.blad)} />
      ) : (
        <div className="card login-card">
          <p className="warning">
            Logowanie jest wyłączone – brak konfiguracji Supabase Auth na serwerze (NEXT_PUBLIC_SUPABASE_URL
            i NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
          </p>
        </div>
      )}
    </main>
  );
}
