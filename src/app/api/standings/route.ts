import { NextResponse } from "next/server";
import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS, MATCHES } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";
import { applyOverrides } from "@/lib/score-overrides";
import type { Fixture, KillerGoals } from "@/lib/types";

/**
 * GET /api/standings
 *
 * Priority order:
 *   1. In-process cache (populated by /api/cron/sync-scores with FDO data)
 *      → includes GK and killer scoring
 *   2. Static MATCHES data with admin overrides applied
 *      → prediction points only (GK/killer = 0 until cron runs)
 */
export async function GET() {
  // 1. Try the enriched cache (written by the cron job after a FDO sync)
  const cached = getStandingsCache();
  if (cached) {
    return NextResponse.json({
      standings: cached.standings,
      meta: {
        totalParticipants: PARTICIPANTS.length,
        playedMatches: cached.standings.length > 0 ? "cached" : 0,
        dataSource: cached.dataSource,
        cachedAt: new Date(cached.cachedAt).toISOString(),
        lastUpdated: new Date(cached.cachedAt).toISOString(),
      },
    });
  }

  // 2. Fallback: static data with overrides, predictions only
  const matches = applyOverrides(MATCHES);

  const fixtures: Fixture[] = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: "",
    awayFlag: "",
    date: "",
    status: m.homeScore !== null ? "FT" : "NS",
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenalties: null,
    awayPenalties: null,
    minute: null,
    phase: "groups",
  }));

  const killerGoals: KillerGoals = { mundialGoals: 0, seleccionGoals: 0 };

  const breakdowns = PARTICIPANTS.map((participant) =>
    calculateParticipantScore({
      participant,
      fixtures,
      goalkeeperData: [],
      killerGoals,
    })
  );

  const standings = buildLeaderboard(breakdowns, fixtures);

  return NextResponse.json({
    standings,
    meta: {
      totalParticipants: PARTICIPANTS.length,
      playedMatches: fixtures.filter((f) => f.status === "FT").length,
      dataSource: "static (no FDO cache yet — run /api/cron/sync-scores to enrich)",
      lastUpdated: new Date().toISOString(),
    },
  });
}
