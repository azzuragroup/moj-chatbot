import { redirect } from "next/navigation";
import Compare from "@/components/Compare";
import { loginPath } from "@/lib/authRedirect";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Porownanie() {
  // Najpierw zweryfikowana sesja (serwer); bez niej – strona logowania.
  if (!(await getCurrentUser())) redirect(loginPath("/porownanie"));
  return <Compare />;
}
