import { redirect } from "next/navigation";
import SocialPlanner from "@/components/SocialPlanner";
import { loginPath } from "@/lib/authRedirect";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlanerPage() {
  // Najpierw zweryfikowana sesja (serwer); bez niej – strona logowania.
  if (!(await getCurrentUser())) redirect(loginPath("/planer"));
  return <SocialPlanner />;
}
