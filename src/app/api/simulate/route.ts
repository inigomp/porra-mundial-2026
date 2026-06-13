import { NextRequest, NextResponse } from "next/server";
import { simulateLiveScenario, type LiveSimulationScenario } from "@/lib/scoring-engine";
import { PARTICIPANTS } from "@/lib/participants";
import type { ParticipantScoreBreakdown } from "@/lib/types";

/**
 * POST /api/simulate
 *
 * Simulates how the standings would change if a live match ends
 * with a given scoreline.
 *
 * Body:
 * {
 *   fixtureId: string,
 *   scenario: { homeScore: number, awayScore: number, description: string },
 *   currentBreakdowns: ParticipantScoreBreakdown[]
 * }
 *
 * Used by the "Proyección de tabla" feature in the live banner.
 */
export async function POST(request: NextRequest) {
  let body: {
    fixtureId: string;
    scenario: LiveSimulationScenario;
    currentBreakdowns: ParticipantScoreBreakdown[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fixtureId, scenario, currentBreakdowns } = body;

  if (!fixtureId || !scenario) {
    return NextResponse.json(
      { error: "fixtureId and scenario are required" },
      { status: 400 }
    );
  }

  const result = simulateLiveScenario(
    scenario,
    fixtureId,
    currentBreakdowns ?? [],
    PARTICIPANTS
  );

  return NextResponse.json(result);
}
