import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/auth/logout
 * Clears the porra_identity cookie.
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("porra_identity");
  return NextResponse.json({ ok: true });
}
