import { cookies } from "next/headers";
import Chat from "@/components/Chat";
import Login from "@/components/Login";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return hasValidSession(session) ? <Chat /> : <Login />;
}
