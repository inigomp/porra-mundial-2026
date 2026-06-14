import { NextRequest, NextResponse } from "next/server";
import {
  getLiveMatches,
  getTodayMatches,
  mapStatus,
  getLiveMinute,
  type ApiLiveMatch,
} from "@/lib/api-football";
import {
  getLiveWCMatches,
  getTodayWCMatches,
  getMatchDetail,
  analyzeGKEvents,
  goalsAgainstTeam,
  goalsByPlayer,
  mapFdoStatus,
  isAvailable as fdoAvailable,
  type FdoMatchSummary,
} from "@/lib/football-data-org";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { setStandingsCache } from "@/lib/standings-cache";
import { setSyncedScoresBulk } from "@/lib/score-overrides";
import { calculateParticipantScore, buildLeaderboard, type FixtureGoalkeeperData } from "@/lib/scoring-engine";
import type { Fixture, GoalkeeperMatchEvent, KillerGoals } from "@/lib/types";

/**
 * GET /api/cron/sync-scores
 *
 * Two-tier data strategy:
 *   Tier 1 (rich): football-data.org (FOOTBALL_DATA_ORG_TOKEN) -> scores + lineups + goals + GK events
 *   Tier 2 (fallback): free-api-live-football-data (RAPIDAPI_KEY) -> live scores only
 *
 * Called by Vercel Cron (daily) and GitHub Actions (every 5 min during matches).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    if (fdoAvailable()) {
      return await syncWithFootballDataOrg();
    }
    return await syncWithFreeApi();
  } catch (err) {
    console.error("[sync-scores] Error:", err);
    return NextResponse.json({ error: "Sync failed", detail: String(err) }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 1: football-data.org — full scoring including GK and killers
// ─────────────────────────────────────────────────────────────────────────────

async function syncWithFootballDataOrg() {
  const [liveMatches, todayMatches] = await Promise.all([
    getLiveWCMatches(),
    getTodayWCMatches(),
  ]);

  const liveIds = new Set(liveMatches.map((m) => m.id));
  const allFdoMatches: FdoMatchSummary[] = [
    ...liveMatches,
    ...todayMatches.filter((m) => !liveIds.has(m.id)),
  ];

  const finishedOrLive = allFdoMatches.filter(
    (m) => m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED"
  );
  const matchDetails = await Promise.all(finishedOrLive.map((m) => getMatchDetail(m.id)));
  const detailMap = new Map(
    matchDetails
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map((d) => [d.id, d])
  );

  const fixtureMap = new Map<string, Fixture>();
  for (const match of MATCHES) {
    const fdoMatch = allFdoMatches.find(
      (m) =>
        teamNameMatches(m.homeTeam.name, match.homeTeam) &&
        teamNameMatches(m.awayTeam.name, match.awayTeam)
    );
    const status = fdoMatch
      ? mapFdoStatus(fdoMatch.status, fdoMatch.score)
      : match.homeScore !== null
      ? "FT"
      : "NS";

    fixtureMap.set(match.id, {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeFlag: "",
      awayFlag: "",
      date: fdoMatch?.utcDate ?? "",
      status: status as Fixture["status"],
      homeScore: fdoMatch?.score.fullTime.home ?? match.homeScore,
      awayScore: fdoMatch?.score.fullTime.away ?? match.awayScore,
      homePenalties: null,
      awayPenalties: null,
      minute: null,
      phase: "groups",
    });
  }

  const fixtures = Array.from(fixtureMap.values());

  // Persist synced scores so grupos/predicciones pages see live results
  setSyncedScoresBulk(
    fixtures
      .filter((f) => f.homeScore !== null && f.awayScore !== null)
      .map((f) => ({
        fixtureId: f.id,
        homeScore: f.homeScore as number,
        awayScore: f.awayScore as number,
        updatedAt: new Date().toISOString(),
      }))
  );

  const breakdowns = PARTICIPANTS.map((participant) => {
    const goalkeeperData: FixtureGoalkeeperData[] = [];
    let mundialGoals = 0;
    let seleccionGoals = 0;

    for (const [internalId, fixture] of fixtureMap.entries()) {
      if (!["FT", "AET", "PEN"].includes(fixture.status)) continue;

      const fdoMatch = allFdoMatches.find(
        (m) =>
          teamNameMatches(m.homeTeam.name, fixture.homeTeam) &&
          teamNameMatches(m.awayTeam.name, fixture.awayTeam)
      );
      if (!fdoMatch) continue;
      const detail = detailMap.get(fdoMatch.id);
      if (!detail) continue;

      // GK scoring
      const gkName = participant.goalkeeper;
      const homeGK = detail.homeTeam.lineup.find((p) => p.position === "Goalkeeper");
      const awayGK = detail.awayTeam.lineup.find((p) => p.position === "Goalkeeper");
      let gkTeamId: number | null = null;
      if (homeGK && fuzzyNameMatch(homeGK.name, gkName)) gkTeamId = detail.homeTeam.id;
      else if (awayGK && fuzzyNameMatch(awayGK.name, gkName)) gkTeamId = detail.awayTeam.id;

      if (gkTeamId !== null) {
        const goalsAgainst = goalsAgainstTeam(detail, gkTeamId);
        const gkEvent = analyzeGKEvents(detail, gkName, gkTeamId);
        let event: GoalkeeperMatchEvent;
        if (gkEvent.type === "red_card" && gkEvent.minute !== undefined) {
          event = { type: "red_card", minute: gkEvent.minute };
        } else if (gkEvent.type === "substituted" && gkEvent.minute !== undefined) {
          event = { type: "substituted", minute: gkEvent.minute, injury: gkEvent.injury ?? false };
        } else if (gkEvent.type === "not_played") {
          event = { type: "not_played", injury: false };
        } else {
          event = { type: "played_full" };
        }
        goalkeeperData.push({ fixtureId: internalId, goalsAgainst, event, phase: fixture.phase });
      }

      // Killer scoring
      mundialGoals += goalsByPlayer(detail, participant.killerMundial);
      seleccionGoals += goalsByPlayer(detail, participant.killerSeleccion);
    }

    return calculateParticipantScore({
      participant,
      fixtures,
      goalkeeperData,
      killerGoals: { mundialGoals, seleccionGoals },
    });
  });

  const standings = buildLeaderboard(breakdowns, fixtures);

  // Persist enriched standings in the module-level cache so /api/standings
  // can serve GK and killer data without calling FDO on every request.
  const killerGoalsByParticipant: Record<string, { mundialGoals: number; seleccionGoals: number }> = {};
  for (const bd of breakdowns) {
    killerGoalsByParticipant[bd.participantId] = {
      mundialGoals: bd.killerMundial.goals,
      seleccionGoals: bd.killerSeleccion.goals,
    };
  }
  setStandingsCache({
    standings,
    goalkeeperData: {},
    killerGoals: killerGoalsByParticipant,
    dataSource: "football-data.org",
  });

  return NextResponse.json({
    ok: true,
    dataSource: "football-data.org",
    liveMatches: liveMatches.length,
    todayMatches: todayMatches.length,
    detailedMatches: detailMap.size,
    standingsCount: standings.length,
    topStandings: standings.slice(0, 10),
    syncedAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2: free-api-live-football-data (scores only)
// ─────────────────────────────────────────────────────────────────────────────

async function syncWithFreeApi() {
  const [liveMatches, todayMatches] = await Promise.all([
    getLiveMatches(),
    getTodayMatches(),
  ]);

  const liveIds = new Set(liveMatches.map((m) => m.id));
  const allApiMatches: ApiLiveMatch[] = [
    ...liveMatches,
    ...todayMatches.filter((m) => !liveIds.has(m.id)),
  ];

  const fixtureMap = new Map<string, Fixture>();
  for (const match of MATCHES) {
    const apiMatch = allApiMatches.find(
      (f) =>
        teamNameMatches(f.home.name, match.homeTeam) &&
        teamNameMatches(f.away.name, match.awayTeam)
    );
    const status = apiMatch ? mapStatus(apiMatch) : match.homeScore !== null ? "FT" : "NS";
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
  const killerGoals: KillerGoals = { mundialGoals: 0, seleccionGoals: 0 };

  const breakdowns = PARTICIPANTS.map((participant) =>
    calculateParticipantScore({ participant, fixtures, goalkeeperData: [], killerGoals })
  );
  const standings = buildLeaderboard(breakdowns, fixtures);

  return NextResponse.json({
    ok: true,
    dataSource: "free-api-live-football-data (scores only — add FOOTBALL_DATA_ORG_TOKEN for GK/killer data)",
    liveMatches: liveMatches.length,
    todayMatches: todayMatches.length,
    standingsCount: standings.length,
    topStandings: standings.slice(0, 10),
    syncedAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function teamNameMatches(apiName: string, localName: string): boolean {
  const a = apiName.toLowerCase().trim();
  const l = localName.toLowerCase().trim();
  if (a === l) return true;
  const aWords = a.split(/\s+/);
  const lWords = l.split(/\s+/);
  return (
    (aWords[0].length > 3 && lWords.some((w) => w.startsWith(aWords[0]))) ||
    (lWords[0].length > 3 && aWords.some((w) => w.startsWith(lWords[0])))
  );
}

function fuzzyNameMatch(apiName: string, localName: string): boolean {
  const a = apiName.toLowerCase();
  const l = localName.toLowerCase();
  if (a === l) return true;
  const aFirst = a.split(" ")[0];
  const lFirst = l.split(" ")[0];
  return (aFirst.length > 3 && l.includes(aFirst)) || (lFirst.length > 3 && a.includes(lFirst));
}
