import { NextResponse } from "next/server";
import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS, MATCHES } from "@/lib/participants";
import type { Fixture, KillerGoals } from "@/lib/types";

/**
 * GET /api/standings
 *
 * Returns the current leaderboard calculated from MATCHES static data.
 * Scores update in real time as match results are added to participants.ts
 * (or synced via /api/cron/sync-scores when the API is active).
 */
export async function GET() {
  // Convert MATCHES to Fixture format
  const fixtures: Fixture[] = MATCHES.map((m) => ({
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

  // Calculate real scores for all participants (no GK/killer data yet)
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
      lastUpdated: new Date().toISOString(),
    },
  });
}
