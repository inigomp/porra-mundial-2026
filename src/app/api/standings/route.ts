import { NextResponse } from "next/server";
import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";
import { getMatchesWithLiveScores } from "@/lib/live-scores";
import { getWCTopScorers, playerKey, normStr } from "@/lib/football-data-org";
import type { Fixture, KillerGoals } from "@/lib/types";

// Prevent Next.js from caching this route handler at the CDN level.
// Individual fetch() calls inside still benefit from revalidate (Data Cache).
export const dynamic = "force-dynamic";

/**
 * GET /api/standings
 *
 * Priority order:
 *   1. In-process cache (populated by /api/cron/sync-scores with FDO data)
 *      → includes GK and killer scoring
 *   2. FDO via fetch cache (revalidate: 60s, shared across all Lambda instances)
 *      → prediction points only (GK/killer = 0 until cron runs)
 */
/**
 * GET /api/standings
 *
 * Always returns accurate standings including killer goals.
 * killer goals come from getWCTopScorers() which uses Next.js fetch cache
 * (revalidate: 60s) — shared across ALL Lambda instances via Vercel's Data Cache.
 *
 * GK data: uses enriched cache if available (written by cron), otherwise 0.
 * The cron is the only source of GK data; prediction + killer data are always live.
 */
export async function GET() {
  // Fetch matches + scorers in parallel — both are Next.js Data Cache cached (60s)
  // and shared across all Lambda instances, so no stale-cache-per-instance problem.
  const [liveMatches, allScorers] = await Promise.all([
    getMatchesWithLiveScores(),
    getWCTopScorers(100),
  ]);

  // Build killer goals lookup from full tournament scorers (no penalties)
  function killerGoalsFor(playerName: string): number {
    const key = playerKey(playerName);
    const entry = allScorers.find((s) => {
      const apiKey = normStr(s.player.name);
      const apiWords = apiKey.split(/\s+/);
      return apiKey.includes(key) || apiWords.some((w) => w === key);
    });
    if (!entry) return 0;
    return Math.max(0, entry.goals - (entry.penalties ?? 0));
  }

  const fixtures: Fixture[] = liveMatches.map((m) => ({
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

  // Get GK data from the enriched cache if available (written by cron)
  const cached = getStandingsCache();

  const breakdowns = PARTICIPANTS.map((participant) => {
    const killerGoals: KillerGoals = {
      mundialGoals: killerGoalsFor(participant.killerMundial),
      seleccionGoals: killerGoalsFor(participant.killerSeleccion),
    };
    const goalkeeperData = cached?.goalkeeperData[participant.id] ?? [];
    return calculateParticipantScore({
      participant,
      fixtures,
      goalkeeperData,
      killerGoals,
    });
  });

  const standings = buildLeaderboard(breakdowns, fixtures);

  return NextResponse.json({
    standings,
    meta: {
      totalParticipants: PARTICIPANTS.length,
      playedMatches: fixtures.filter((f) => f.status === "FT").length,
      dataSource: cached ? "scorers-api+gk-cache" : "scorers-api (no gk data yet)",
      lastUpdated: new Date().toISOString(),
    },
  });
}
