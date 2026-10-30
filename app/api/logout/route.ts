import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
