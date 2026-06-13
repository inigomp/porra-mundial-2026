import { NextResponse } from "next/server";
import { buildLeaderboard } from "@/lib/scoring-engine";
import { PARTICIPANTS } from "@/lib/participants";
import type { ParticipantScoreBreakdown } from "@/lib/types";

/**
 * GET /api/standings
 *
 * Returns the current leaderboard.
 * In production, breakdowns are fetched from the database (calculated by the cron worker).
 * Here we return the skeleton with all 106 participants at 0 points until
 * real fixture data is available.
 */
export async function GET() {
  // Skeleton breakdowns — replaced by real data from DB in production
  const skeletonBreakdowns: ParticipantScoreBreakdown[] = PARTICIPANTS.map((p) => ({
    participantId: p.id,
    participantName: p.name,
    matchPredictions: [],
    goalkeeperMatches: [],
    killerMundial: {
      killerName: p.killerMundial,
      killerType: "mundial",
      goals: 0,
      pointsPerGoal: 2,
      totalPoints: 0,
    },
    killerSeleccion: {
      killerName: p.killerSeleccion,
      killerType: "seleccion",
      goals: 0,
      pointsPerGoal: 1,
      totalPoints: 0,
    },
    totalFromPredictions: 0,
    totalFromGoalkeeper: 0,
    totalFromKillers: 0,
    grandTotal: 0,
    groupStageTotal: 0,
  }));

  const standings = buildLeaderboard(skeletonBreakdowns, []);

  return NextResponse.json({
    standings,
    meta: {
      totalParticipants: PARTICIPANTS.length,
      lastUpdated: new Date().toISOString(),
    },
  });
}
