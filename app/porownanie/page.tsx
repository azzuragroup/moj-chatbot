import { cookies } from "next/headers";
import Compare from "@/components/Compare";
import Login from "@/components/Login";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Porownanie() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return hasValidSession(session) ? <Compare /> : <Login />;
}
