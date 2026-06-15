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
import { getWCTopScorers, playerKey, normStr } from "@/lib/football-data-org";
import { PARTICIPANTS } from "@/lib/participants";

function isAuthorized(adminCookie: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return adminCookie === secret;
}

function goalsFromScorers(
  scorers: Awaited<ReturnType<typeof getWCTopScorers>>,
  playerName: string
): number {
  const key = playerKey(playerName);
  const entry = scorers.find((s) => {
    const apiKey = normStr(s.player.name);
    const apiWords = apiKey.split(/\s+/);
    return apiKey.includes(key) || apiWords.some((w) => w === key);
  });
  if (!entry) return 0;
  return Math.max(0, entry.goals - (entry.penalties ?? 0));
}

/** GET /api/admin/killer-gk-overrides — returns overrides + current values from cache or live API */
export async function GET() {
  const cookieStore = await cookies();
  if (!isAuthorized(cookieStore.get("porra_admin")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cache = getStandingsCache();

  // If cache is available use it; otherwise fetch live scorers (CDN-cached 60s)
  const currentKillerGoals: Record<string, number> = {};
  const currentSeleccionGoals: Record<string, number> = {};
  const currentGkPoints: Record<string, number> = {};

  if (cache) {
    for (const p of PARTICIPANTS) {
      const kg = cache.killerGoals[p.id];
      if (kg) {
        if (!(p.killerMundial in currentKillerGoals))
          currentKillerGoals[p.killerMundial] = kg.mundialGoals;
        if (!(p.killerSeleccion in currentSeleccionGoals))
          currentSeleccionGoals[p.killerSeleccion] = kg.seleccionGoals;
      }
      const gkPts = cache.goalkeeperPoints[p.id];
      if (gkPts !== undefined && !(p.goalkeeper in currentGkPoints))
        currentGkPoints[p.goalkeeper] = gkPts;
    }
  } else {
    // Fallback: fetch live from scorers API (Next.js CDN-cached 60s — one request)
    try {
      const scorers = await getWCTopScorers(100);
      const uniqueMundial = Array.from(new Set(PARTICIPANTS.map((p) => p.killerMundial)));
      const uniqueSeleccion = Array.from(new Set(PARTICIPANTS.map((p) => p.killerSeleccion)));
      for (const name of uniqueMundial) currentKillerGoals[name] = goalsFromScorers(scorers, name);
      for (const name of uniqueSeleccion) currentSeleccionGoals[name] = goalsFromScorers(scorers, name);
    } catch {
      // leave as empty — admin will see 0 / missing values
    }
  }

  return NextResponse.json({
    killerOverrides: getAllKillerOverrides(),
    gkOverrides: getAllGkOverrides(),
    currentKillerGoals,
    currentSeleccionGoals,
    currentGkPoints,
  });
}
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
