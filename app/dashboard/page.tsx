import { cookies } from "next/headers";
import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";
import { SESSION_COOKIE, hasValidSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  return hasValidSession(session) ? <Dashboard /> : <Login />;
}
