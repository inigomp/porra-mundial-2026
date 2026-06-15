import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getPlayoffActuals,
  setPlayoffActual,
  deletePlayoffActual,
} from "@/lib/score-overrides";

async function checkAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("porra_admin")?.value === process.env.ADMIN_SECRET;
}

/** GET /api/admin/playoff-actuals — returns current actuals map */
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ actuals: getPlayoffActuals() });
}

/**
 * POST /api/admin/playoff-actuals
 * Body: { slot: string; team: string }
 * Sets a single slot result.
 */
export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slot: string; team: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slot, team } = body;
  if (!slot || !team) {
    return NextResponse.json({ error: "slot and team are required" }, { status: 400 });
  }

  setPlayoffActual(slot, team.trim());
  return NextResponse.json({ ok: true, slot, team: team.trim() });
}

/**
 * DELETE /api/admin/playoff-actuals?slot=...
 * Clears a single slot result.
 */
export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slot = new URL(request.url).searchParams.get("slot");
  if (!slot) {
    return NextResponse.json({ error: "slot query param required" }, { status: 400 });
  }

  deletePlayoffActual(slot);
  return NextResponse.json({ ok: true });
}
