import { cookies } from "next/headers";
import SocialPlanner from "@/components/SocialPlanner";
import Login from "@/components/Login";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlanerPage() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return hasValidSession(session) ? <SocialPlanner /> : <Login />;
}
