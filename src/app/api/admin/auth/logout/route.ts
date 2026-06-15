import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/auth/logout
 * Clears the porra_admin cookie and redirects to /admin login.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete("porra_admin");
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/admin`, 303);
}
