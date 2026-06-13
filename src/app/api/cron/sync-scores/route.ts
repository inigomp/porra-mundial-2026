import { NextRequest, NextResponse } from "next/server";
import {
  getLiveFixtures,
  getFixtureLineups,
  getFixtureEvents,
  extractGoalkeeper,
  analyzeGoalkeeperEvent,
  goalsAgainstExcludingPenalties,
} from "@/lib/api-football";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { calculateParticipantScore, buildLeaderboard, type FixtureGoalkeeperData } from "@/lib/scoring-engine";
import type { Fixture, GoalkeeperMatchEvent, KillerGoals } from "@/lib/types";

/**
 * GET /api/cron/sync-scores
 *
 * Called by Vercel Cron every 2 minutes.
 * - Fetches live + finished fixtures from API-Football
 * - Updates goalkeeper events per participant
 * - Recalculates all standings
 * - Returns updated standings JSON
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get live fixtures from API-Football
    const liveFixtures = await getLiveFixtures();

    // 2. Build Fixture objects matching our MATCHES list
    const fixtureMap = new Map<string, Fixture>();

    for (const match of MATCHES) {
      // Try to match by team names
      const apiFixture = liveFixtures.find(
        (f) =>
          (f.teams.home.name.toLowerCase().includes(match.homeTeam.toLowerCase()) ||
           match.homeTeam.toLowerCase().includes(f.teams.home.name.toLowerCase())) &&
          (f.teams.away.name.toLowerCase().includes(match.awayTeam.toLowerCase()) ||
           match.awayTeam.toLowerCase().includes(f.teams.away.name.toLowerCase()))
      );

      const status = (apiFixture?.fixture.status.short ?? "NS") as Fixture["status"];
      const isFinished = ["FT", "AET", "PEN"].includes(status);

      fixtureMap.set(match.id, {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeFlag: "",
        awayFlag: "",
        date: apiFixture?.fixture.date ?? "",
        status,
        homeScore: apiFixture?.goals.home ?? match.homeScore,
        awayScore: apiFixture?.goals.away ?? match.awayScore,
        homePenalties: apiFixture?.score.penalty.home ?? null,
        awayPenalties: apiFixture?.score.penalty.away ?? null,
        minute: apiFixture?.fixture.status.elapsed ?? null,
        phase: derivePhase(apiFixture?.league.round ?? ""),
      });

      // 3. For live/finished matches, fetch goalkeeper data
      if (apiFixture && (isFinished || status === "1H" || status === "2H" || status === "ET")) {
        const [lineups, events] = await Promise.all([
          getFixtureLineups(apiFixture.fixture.id),
          getFixtureEvents(apiFixture.fixture.id),
        ]);

        // Store in memory cache keyed by fixture id (in production, use DB)
        goalkeeperCache.set(match.id, { lineups, events, apiFixtureId: apiFixture.fixture.id });
      }
    }

    const fixtures = Array.from(fixtureMap.values());

    // 4. Calculate scores for each participant
    const breakdowns = PARTICIPANTS.map((participant) => {
      const goalkeeperData: FixtureGoalkeeperData[] = [];

      for (const [fixtureId, cached] of goalkeeperCache.entries()) {
        const fixture = fixtureMap.get(fixtureId);
        if (!fixture) continue;

        // Find which team the participant's GK plays for (by matching name)
        const gkName = participant.goalkeeper;
        let teamId: number | null = null;
        let isHomeTeam = false;

        for (const lineup of cached.lineups) {
          const gk = lineup.startXI.find((p) =>
            p.player.pos === "G" &&
            (p.player.name.toLowerCase().includes(gkName.toLowerCase().split(" ")[0]) ||
             gkName.toLowerCase().includes(p.player.name.toLowerCase().split(" ")[0]))
          );
          if (gk) {
            teamId = lineup.team.id;
            isHomeTeam = cached.lineups.indexOf(lineup) === 0;
            break;
          }
        }

        if (teamId === null) continue; // GK didn't play in this match

        const goalsAgainst = goalsAgainstExcludingPenalties(
          // Reconstruct minimal API fixture shape
          {
            fixture: { id: cached.apiFixtureId, status: { short: fixture.status, elapsed: fixture.minute }, date: fixture.date },
            teams: { home: { id: isHomeTeam ? teamId : 0, name: fixture.homeTeam }, away: { id: !isHomeTeam ? teamId : 0, name: fixture.awayTeam } },
            goals: { home: fixture.homeScore, away: fixture.awayScore },
            score: { extratime: { home: null, away: null }, penalty: { home: fixture.homePenalties, away: fixture.awayPenalties } },
            league: { round: "" },
          },
          isHomeTeam
        );

        const gkAnalysis = analyzeGoalkeeperEvent(cached.events, gkName, teamId);

        let event: GoalkeeperMatchEvent;
        if (gkAnalysis.redCard) {
          event = { type: "red_card", minute: gkAnalysis.minute ?? 90 };
        } else if (gkAnalysis.substituted && gkAnalysis.minute !== null) {
          event = { type: "substituted", minute: gkAnalysis.minute, injury: gkAnalysis.injury };
        } else {
          event = { type: "played_full" };
        }

        goalkeeperData.push({
          fixtureId,
          goalsAgainst,
          event,
          phase: fixture.phase,
        });
      }

      // Killer goals — accumulated from all finished matches
      // TODO: track killer goals from events once API-Football is active
      const killerGoals: KillerGoals = { mundialGoals: 0, seleccionGoals: 0 };

      return calculateParticipantScore({
        participant,
        fixtures,
        goalkeeperData,
        killerGoals,
      });
    });

    const standings = buildLeaderboard(breakdowns, fixtures);

    return NextResponse.json({
      ok: true,
      liveMatches: liveFixtures.length,
      standingsCount: standings.length,
      standings: standings.slice(0, 10), // top 10 preview
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[sync-scores] Error:", err);
    return NextResponse.json({ error: "Sync failed", detail: String(err) }, { status: 500 });
  }
}

// In-memory cache (replaced by DB in production)
const goalkeeperCache = new Map<
  string,
  { lineups: Awaited<ReturnType<typeof getFixtureLineups>>; events: Awaited<ReturnType<typeof getFixtureEvents>>; apiFixtureId: number }
>();

function derivePhase(round: string): Fixture["phase"] {
  const r = round.toLowerCase();
  if (r.includes("final") && r.includes("3rd")) return "third_place";
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter")) return "final";
  if (r.includes("semi")) return "semi";
  if (r.includes("quarter")) return "quarter";
  if (r.includes("16") || r.includes("round of 16")) return "round_of_16";
  return "groups";
}
