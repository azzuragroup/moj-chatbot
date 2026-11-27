import { redirect } from "next/navigation";
import Analyze from "@/components/Analyze";
import { loginPath } from "@/lib/authRedirect";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Analiza() {
  // Najpierw zweryfikowana sesja (serwer); bez niej – strona logowania.
  if (!(await getCurrentUser())) redirect(loginPath("/analiza"));
  return <Analyze />;
}
