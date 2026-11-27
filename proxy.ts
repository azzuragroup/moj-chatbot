import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Next.js 16: plik pośredniczący nazywa się proxy.ts (dawniej middleware.ts). */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Wszystko poza plikami statycznymi, optymalizacją obrazów, favicon i obrazkami.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
