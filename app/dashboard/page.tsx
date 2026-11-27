import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { loginPath } from "@/lib/authRedirect";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Najpierw zweryfikowana sesja (serwer); bez niej – strona logowania.
  if (!(await getCurrentUser())) redirect(loginPath("/dashboard"));
  return <Dashboard />;
}
