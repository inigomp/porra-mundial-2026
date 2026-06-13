import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAllOverrides,
  setOverride,
  deleteOverride,
  type ScoreOverride,
} from "@/lib/score-overrides";
import { clearStandingsCache } from "@/lib/standings-cache";

function isAuthorized(adminCookie: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return adminCookie === secret;
}

/**
 * GET /api/admin/overrides
 * Returns all active score overrides.
 */
export async function GET() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("porra_admin")?.value;

  if (!isAuthorized(adminCookie)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ overrides: getAllOverrides() });
}

/**
 * POST /api/admin/overrides
 * Body: { fixtureId: string; homeScore: number; awayScore: number }
 * Sets or updates a score override. Clears the standings cache.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("porra_admin")?.value;

  if (!isAuthorized(adminCookie)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { fixtureId: string; homeScore: number; awayScore: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fixtureId, homeScore, awayScore } = body;

  if (
    !fixtureId ||
    typeof homeScore !== "number" ||
    typeof awayScore !== "number" ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return NextResponse.json(
      { error: "fixtureId (string), homeScore (number ≥ 0), awayScore (number ≥ 0) required" },
      { status: 400 }
    );
  }

  const override: ScoreOverride = {
    fixtureId,
    homeScore,
    awayScore,
    updatedAt: new Date().toISOString(),
  };

  setOverride(override);
  clearStandingsCache();

  return NextResponse.json({ ok: true, override });
}

/**
 * DELETE /api/admin/overrides?fixtureId=X
 * Removes a score override.
 */
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("porra_admin")?.value;

  if (!isAuthorized(adminCookie)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("fixtureId");

  if (!fixtureId) {
    return NextResponse.json({ error: "fixtureId query param required" }, { status: 400 });
  }

  const removed = deleteOverride(fixtureId);
  if (removed) clearStandingsCache();

  return NextResponse.json({ ok: true, removed });
}
