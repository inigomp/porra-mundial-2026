import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAllKillerOverrides,
  getAllGkOverrides,
  setKillerOverride,
  setGkOverride,
  deleteKillerOverride,
  deleteGkOverride,
  type KillerOverride,
  type GkOverride,
} from "@/lib/score-overrides";
import { clearStandingsCache, getStandingsCache } from "@/lib/standings-cache";
import { PARTICIPANTS } from "@/lib/participants";

function isAuthorized(adminCookie: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return adminCookie === secret;
}

/** GET /api/admin/killer-gk-overrides — returns all active killer and GK overrides + current computed values */
export async function GET() {
  const cookieStore = await cookies();
  if (!isAuthorized(cookieStore.get("porra_admin")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build current computed values from standings cache (written by cron)
  const cache = getStandingsCache();

  // killer name → goals (from first participant that has this killer in cache)
  const currentKillerGoals: Record<string, number> = {};
  // gk name → total points (from first participant that has this GK in cache)
  const currentGkPoints: Record<string, number> = {};

  if (cache) {
    for (const p of PARTICIPANTS) {
      const kg = cache.killerGoals[p.id];
      if (kg && !(p.killerMundial in currentKillerGoals)) {
        currentKillerGoals[p.killerMundial] = kg.mundialGoals;
      }
      const gkPts = cache.goalkeeperPoints[p.id];
      if (gkPts !== undefined && !(p.goalkeeper in currentGkPoints)) {
        currentGkPoints[p.goalkeeper] = gkPts;
      }
    }
  }

  return NextResponse.json({
    killerOverrides: getAllKillerOverrides(),
    gkOverrides: getAllGkOverrides(),
    currentKillerGoals,
    currentGkPoints,
  });
}

/**
 * POST /api/admin/killer-gk-overrides
 * Body (killer): { type: "killer"; playerName: string; mundialGoals: number }
 * Body (gk):     { type: "gk";     gkName: string;    points: number }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthorized(cookieStore.get("porra_admin")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (body.type === "killer") {
    const { playerName, mundialGoals } = body as { playerName: string; mundialGoals: number };
    if (!playerName || typeof mundialGoals !== "number" || mundialGoals < 0) {
      return NextResponse.json({ error: "playerName and mundialGoals (≥0) required" }, { status: 400 });
    }
    const override: KillerOverride = { playerName, mundialGoals, updatedAt: now };
    setKillerOverride(override);
    clearStandingsCache();
    return NextResponse.json({ ok: true, override });
  }

  if (body.type === "gk") {
    const { gkName, points } = body as { gkName: string; points: number };
    if (!gkName || typeof points !== "number") {
      return NextResponse.json({ error: "gkName and points (integer) required" }, { status: 400 });
    }
    const override: GkOverride = { gkName, points, updatedAt: now };
    setGkOverride(override);
    clearStandingsCache();
    return NextResponse.json({ ok: true, override });
  }

  return NextResponse.json({ error: 'type must be "killer" or "gk"' }, { status: 400 });
}

/**
 * DELETE /api/admin/killer-gk-overrides?type=killer&name=Gyökeres+(SUE)
 * DELETE /api/admin/killer-gk-overrides?type=gk&name=Pickford+(ING)
 */
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isAuthorized(cookieStore.get("porra_admin")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const name = searchParams.get("name");

  if (!type || !name) {
    return NextResponse.json({ error: "type and name query params required" }, { status: 400 });
  }

  let deleted = false;
  if (type === "killer") {
    deleted = deleteKillerOverride(name);
  } else if (type === "gk") {
    deleted = deleteGkOverride(name);
  } else {
    return NextResponse.json({ error: 'type must be "killer" or "gk"' }, { status: 400 });
  }

  if (deleted) clearStandingsCache();
  return NextResponse.json({ ok: true, deleted });
}
