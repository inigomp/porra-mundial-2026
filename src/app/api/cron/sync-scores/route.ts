import { NextRequest, NextResponse } from "next/server";
import {
  getLiveMatches,
  getTodayMatches,
  mapStatus,
  getLiveMinute,
  type ApiLiveMatch,
} from "@/lib/api-football";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { calculateParticipantScore, buildLeaderboard } from "@/lib/scoring-engine";
import type { Fixture, KillerGoals } from "@/lib/types";

/**
 * GET /api/cron/sync-scores
 *
 * Polls the Free API Live Football Data for live/finished World Cup matches,
 * maps them to our internal Fixture format, recalculates all participant scores,
 * and returns the updated standings.
 *
 * Called by Vercel Cron (daily) and/or GitHub Actions (every 5 min during matches).
 * Protected by optional CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // 1. Fetch live + today's matches
    const [liveMatches, todayMatches] = await Promise.all([
      getLiveMatches(),
      getTodayMatches(),
    ]);

    // Merge: live takes priority over today (more up-to-date scores)
    const liveIds = new Set(liveMatches.map((m) => m.id));
    const allApiMatches: ApiLiveMatch[] = [
      ...liveMatches,
      ...todayMatches.filter((m) => !liveIds.has(m.id)),
    ];

    // 2. Build Fixture map, merging API results with our static MATCHES data
    const fixtureMap = new Map<string, Fixture>();

    for (const match of MATCHES) {
      // Match by team name (fuzzy)
      const apiMatch = allApiMatches.find(
        (f) =>
          teamNameMatches(f.home.name, match.homeTeam) &&
          teamNameMatches(f.away.name, match.awayTeam)
      );

      const status = apiMatch ? mapStatus(apiMatch) : (match.homeScore !== null ? "FT" : "NS");
      const minute = apiMatch ? getLiveMinute(apiMatch) : null;

      fixtureMap.set(match.id, {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeFlag: "",
        awayFlag: "",
        date: apiMatch?.status.utcTime ?? "",
        status: status as Fixture["status"],
        homeScore: apiMatch?.home.score ?? match.homeScore,
        awayScore: apiMatch?.away.score ?? match.awayScore,
        homePenalties: null,
        awayPenalties: null,
        minute,
        phase: "groups",
      });
    }

    const fixtures = Array.from(fixtureMap.values());

    // 3. Calculate scores for each participant
    // Note: GK and killer data is not available from this API → these default to 0
    // They will need manual updates via the /api/scoring endpoint
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
      ok: true,
      liveMatches: liveMatches.length,
      todayMatches: todayMatches.length,
      standingsCount: standings.length,
      topStandings: standings.slice(0, 10),
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[sync-scores] Error:", err);
    return NextResponse.json({ error: "Sync failed", detail: String(err) }, { status: 500 });
  }
}

/** Fuzzy team name matching (handles "Korea Republic" vs "Corea del Sur" etc.) */
function teamNameMatches(apiName: string, localName: string): boolean {
  const a = apiName.toLowerCase().trim();
  const l = localName.toLowerCase().trim();
  if (a === l) return true;
  const aWords = a.split(/\s+/);
  const lWords = l.split(/\s+/);
  return (
    aWords[0].length > 3 && lWords.some((w) => w.startsWith(aWords[0])) ||
    lWords[0].length > 3 && aWords.some((w) => w.startsWith(lWords[0]))
  );
}
