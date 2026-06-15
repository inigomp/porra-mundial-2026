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
  getRecentWCMatches,
  getMatchDetail,
  getFinishedMatchDetail,
  analyzeGKEvents,
  goalsAgainstTeam,
  getWCTopScorers,
  getWCStandings,
  getAllFinishedWCMatches,
  playerKey,
  normStr as fdoNormStr,
  mapFdoStatus,
  isAvailable as fdoAvailable,
  type FdoMatchSummary,
} from "@/lib/football-data-org";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { teamsMatch } from "@/lib/live-scores";
import { setStandingsCache } from "@/lib/standings-cache";
import { calculateParticipantScore, buildLeaderboard, type FixtureGoalkeeperData } from "@/lib/scoring-engine";
import { getKillerOverride, getGkOverride, getPlayoffActuals } from "@/lib/score-overrides";
import { PLAYOFF_SLOTS } from "@/lib/playoff-slots";
import { buildPlayoffActuals } from "@/lib/playoff-actuals";
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
  const [liveMatches, recentMatches, allScorers, fdoStandings, allFinishedMatches] = await Promise.all([
    getLiveWCMatches(),
    getRecentWCMatches(2),
    getWCTopScorers(100),
    getWCStandings(),
    getAllFinishedWCMatches(),
  ]);

  // Auto-derive playoff actuals from standings + finished matches; admin overrides take priority.
  const playoffActuals = buildPlayoffActuals(fdoStandings, allFinishedMatches, getPlayoffActuals());

  const liveIds = new Set(liveMatches.map((m) => m.id));
  // allFdoMatches: live + ALL finished (not just last 2 days) — needed for full GK scoring history
  const allFdoMatches: FdoMatchSummary[] = [
    ...liveMatches,
    ...allFinishedMatches.filter((m) => !liveIds.has(m.id)),
  ];

  const finishedOrLive = allFdoMatches.filter(
    (m) => m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED"
  );
  // Use getFinishedMatchDetail (1h cache) for finished matches to stay within rate limits;
  // getMatchDetail (60s cache) for live/in-progress matches.
  const matchDetails = await Promise.all(
    finishedOrLive.map((m) =>
      m.status === "FINISHED" ? getFinishedMatchDetail(m.id) : getMatchDetail(m.id)
    )
  );
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

  // Killer mundial: look up each participant's chosen killer in the full scorers list.
  // getWCTopScorers(100) covers ALL tournament goals (not just last 2 days).
  // Penalties don't count per scoring rules: non-penalty goals = goals - penalties.
  function killerGoalsFromScorers(playerName: string): number {
    const key = playerKey(playerName);
    const entry = allScorers.find((s) => {
      const apiKey = fdoNormStr(s.player.name);
      const apiWords = apiKey.split(/\s+/);
      return apiKey.includes(key) || apiWords.some((w) => w === key);
    });
    if (!entry) return 0;
    return Math.max(0, entry.goals - (entry.penalties ?? 0));
  }

  const breakdowns = PARTICIPANTS.map((participant) => {
    const goalkeeperData: FixtureGoalkeeperData[] = [];

    // ── Killer goals (full-tournament, via scorers API; admin override wins) ─
    const mundialOverride = getKillerOverride(participant.killerMundial);
    const mundialGoals = mundialOverride !== null ? mundialOverride : killerGoalsFromScorers(participant.killerMundial);
    const seleccionOverride = getKillerOverride(participant.killerSeleccion);
    const seleccionGoals = seleccionOverride !== null ? seleccionOverride : killerGoalsFromScorers(participant.killerSeleccion);

    // ── GK scoring (per-match, from recent match details) ────────────────────
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

      const gkName = participant.goalkeeper;
      const homeGK = (detail.lineups?.homeTeam?.startXI ?? []).find((p) => p.position === "Goalkeeper");
      const awayGK = (detail.lineups?.awayTeam?.startXI ?? []).find((p) => p.position === "Goalkeeper");
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
    }

    const breakdown = calculateParticipantScore({
      participant,
      fixtures,
      goalkeeperData,
      killerGoals: { mundialGoals, seleccionGoals },
      playoffPredictions: PLAYOFF_SLOTS[participant.id],
      playoffActuals,
    });

    // Admin GK override: replace computed GK points with the manually set value.
    const gkOverridePts = getGkOverride(participant.goalkeeper);
    if (gkOverridePts !== null) {
      return { ...breakdown, totalFromGoalkeeper: gkOverridePts };
    }
    return breakdown;
  });

  const standings = buildLeaderboard(breakdowns, fixtures);

  // Persist enriched standings in the module-level cache so /api/standings
  // can serve GK and killer data without calling FDO on every request.
  const killerGoalsByParticipant: Record<string, { mundialGoals: number; seleccionGoals: number }> = {};
  const goalkeeperPointsByParticipant: Record<string, number> = {};
  for (const bd of breakdowns) {
    killerGoalsByParticipant[bd.participantId] = {
      mundialGoals: bd.killerMundial.goals,
      seleccionGoals: bd.killerSeleccion.goals,
    };
    goalkeeperPointsByParticipant[bd.participantId] = bd.totalFromGoalkeeper;
  }
  setStandingsCache({
    standings,
    goalkeeperData: {},
    killerGoals: killerGoalsByParticipant,
    goalkeeperPoints: goalkeeperPointsByParticipant,
    dataSource: "football-data.org",
  });

  return NextResponse.json({
    ok: true,
    dataSource: "football-data.org",
    liveMatches: liveMatches.length,
    recentMatches: recentMatches.length,
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

  // Free-API path: no standings available; use admin overrides only for playoff actuals.
  const playoffActuals = getPlayoffActuals();
  const breakdowns = PARTICIPANTS.map((participant) =>
    calculateParticipantScore({
      participant,
      fixtures,
      goalkeeperData: [],
      killerGoals,
      playoffPredictions: PLAYOFF_SLOTS[participant.id],
      playoffActuals,
    })
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
  return teamsMatch(apiName, localName);
}

function normStr(s: string): string {
  return s.toLowerCase()
    .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i").replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u").replace(/ñ/g, "n").replace(/ç/g, "c");
}

// Known nicknames that differ from FDO registered name
const GK_ALIASES: Record<string, string> = {
  "bono": "bounou",   // Yassine Bounou (Morocco) plays as "Bono"
};

function fuzzyNameMatch(apiName: string, localName: string): boolean {
  // Strip "(XXX)" country code: "Costa (POR)" → "Costa"
  const cleanLocal = localName.replace(/\s*\([^)]+\)\s*$/, "").trim();
  const a = normStr(apiName);
  const l = normStr(cleanLocal);
  // Alias check (e.g. Bono → Bounou)
  const alias = GK_ALIASES[l];
  if (alias && a.includes(alias)) return true;
  if (a === l || a.includes(l) || l.includes(a)) return true;
  // Word-level: any word of the local name matches a word in the API name
  const aWords = a.split(/\s+/);
  const lWords = l.split(/\s+/);
  return lWords.some((lw) => lw.length > 2 && aWords.some((aw) => aw === lw));
}
