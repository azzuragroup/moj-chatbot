import { cookies } from "next/headers";
import Analyze from "@/components/Analyze";
import Login from "@/components/Login";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Analiza() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return hasValidSession(session) ? <Analyze /> : <Login />;
}
