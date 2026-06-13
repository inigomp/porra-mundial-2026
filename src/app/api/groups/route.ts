import { NextResponse } from "next/server";
import { MATCHES } from "@/lib/participants";
import { applyOverrides } from "@/lib/score-overrides";
import {
  GROUPS,
  TEAM_FLAGS,
  calculateGroupStandings,
  type GroupResult,
  type GroupMatch,
} from "@/lib/groups";

/**
 * GET /api/groups
 * Returns all 12 groups with match results and group standings.
 */
export async function GET() {
  // Apply any admin overrides to the static match data
  const matches = applyOverrides(MATCHES);

  // Build a lookup map: matchId → match
  const matchMap = new Map(
    matches.map((m) => [
      m.id,
      {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      },
    ])
  );

  const results: GroupResult[] = GROUPS.map((group) => {
    const groupMatches: GroupMatch[] = group.matchIds.map((matchId) => {
      const m = matchMap.get(matchId);
      return {
        id: matchId,
        homeTeam: m?.homeTeam ?? "?",
        homeFlag: TEAM_FLAGS[m?.homeTeam ?? ""] ?? "🏳",
        awayTeam: m?.awayTeam ?? "?",
        awayFlag: TEAM_FLAGS[m?.awayTeam ?? ""] ?? "🏳",
        homeScore: m?.homeScore ?? null,
        awayScore: m?.awayScore ?? null,
      };
    });

    const standings = calculateGroupStandings(group, matchMap);

    return { name: group.name, matches: groupMatches, standings };
  });

  return NextResponse.json({
    groups: results,
    playedMatches: matches.filter((m) => m.homeScore !== null).length,
    lastUpdated: new Date().toISOString(),
  });
}
