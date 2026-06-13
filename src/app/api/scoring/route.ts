import { NextRequest, NextResponse } from "next/server";
import {
  calculateParticipantScore,
  buildLeaderboard,
  type ScoringInput,
  type FixtureGoalkeeperData,
} from "@/lib/scoring-engine";
import { PARTICIPANTS } from "@/lib/participants";
import type { Fixture, KillerGoals } from "@/lib/types";

/**
 * POST /api/scoring
 *
 * Calculates points for all participants given finished fixtures,
 * goalkeeper events and killer goal tallies.
 *
 * Body:
 * {
 *   fixtures: Fixture[],
 *   goalkeeperEvents: Record<participantId, FixtureGoalkeeperData[]>,
 *   killerGoals: Record<participantId, KillerGoals>
 * }
 */
export async function POST(request: NextRequest) {
  let body: {
    fixtures: Fixture[];
    goalkeeperEvents: Record<string, FixtureGoalkeeperData[]>;
    killerGoals: Record<string, KillerGoals>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fixtures, goalkeeperEvents, killerGoals } = body;

  if (!fixtures || !Array.isArray(fixtures)) {
    return NextResponse.json({ error: "fixtures array required" }, { status: 400 });
  }

  const breakdowns = PARTICIPANTS.map((participant) => {
    const input: ScoringInput = {
      participant,
      fixtures,
      goalkeeperData: goalkeeperEvents?.[participant.id] ?? [],
      killerGoals: killerGoals?.[participant.id] ?? { mundialGoals: 0, seleccionGoals: 0 },
    };
    return calculateParticipantScore(input);
  });

  const standings = buildLeaderboard(breakdowns, fixtures);

  return NextResponse.json({
    standings,
    breakdowns,
    meta: {
      totalParticipants: PARTICIPANTS.length,
      fixturesProcessed: fixtures.filter((f) => ["FT", "AET", "PEN"].includes(f.status)).length,
    },
  });
}

/**
 * GET /api/scoring?participantId=X
 *
 * Returns scoring breakdown for a single participant.
 * Requires fixtures/goalkeeper/killer data passed as query params (demo only).
 * In production, this should be fetched from the database.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const participantId = searchParams.get("participantId");

  if (!participantId) {
    return NextResponse.json(
      { error: "participantId query param required" },
      { status: 400 }
    );
  }

  const participant = PARTICIPANTS.find((p) => p.id === participantId);
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  // With empty data, scores will be 0 — real data comes from the cron worker
  const breakdown = calculateParticipantScore({
    participant,
    fixtures: [],
    goalkeeperData: [],
    killerGoals: { mundialGoals: 0, seleccionGoals: 0 },
  });

  return NextResponse.json(breakdown);
}
