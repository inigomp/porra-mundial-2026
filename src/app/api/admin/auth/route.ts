import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/auth
 * Body: { password: string }
 *
 * Validates the admin password and sets the porra_admin cookie.
 */
export async function POST(request: Request) {
  let body: { password: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  }

  if (body.password !== secret) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("porra_admin", secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.json({ ok: true });
}
