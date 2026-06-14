/**
 * Computes killer goals and GK points rankings directly from the FDO fetch cache.
 *
 * Unlike the standings-cache (in-process Map, one Lambda instance only), this
 * uses fetch() calls with next.revalidate — shared across all Vercel Lambda instances
 * via Vercel Data Cache. Works on every cold-start without needing the cron.
 *
 * Score-override priority: We use getMatchesWithLiveScores() (which applies admin
 * overrides) to determine which matches are confirmed finished before fetching FDO
 * details. Player-level events (goals, GK actions) come exclusively from FDO since
 * admin overrides only store homeScore/awayScore, not per-player event data.
 */

import { PARTICIPANTS } from "./participants";
import {
  getLiveWCMatches,
  getRecentWCMatches,
  getMatchDetail,
  goalsByPlayer,
  analyzeGKEvents,
  goalsAgainstTeam,
  normStr,
  playerKey,
  GK_ALIASES,
  type FdoMatchDetail,
  type FdoMatchSummary,
} from "./football-data-org";
import { getMatchesWithLiveScores, teamsMatch } from "./live-scores";
import { goalkeeperGoalsConcededScore } from "./scoring-engine";
import { POINTS } from "./scoring-engine";
import type { GoalkeeperMatchEvent, KillerRankEntry, GkRankEntry, EnrichedRankings } from "./types";
export type { KillerRankEntry, GkRankEntry, EnrichedRankings };

/** Fuzzy match GK porra name against FDO API name using playerKey + GK_ALIASES */
function fuzzyMatchGK(apiName: string, porraName: string): boolean {
  const apiKey = normStr(apiName);
  const porraKey = playerKey(porraName);
  const aliases = GK_ALIASES[porraKey] ?? [];
  if (apiKey.includes(porraKey) || porraKey.includes(apiKey)) return true;
  return aliases.some((a) => apiKey.includes(a) || a.includes(apiKey));
}

function gkEventPoints(event: GoalkeeperMatchEvent, goalsAgainst: number): number {
  switch (event.type) {
    case "not_played": return event.injury ? 0 : POINTS.GOALKEEPER_NO_PLAY_NO_INJURY;
    case "red_card": return POINTS.GOALKEEPER_RED_CARD;
    case "substituted":
      if (event.minute < 75) return event.injury ? POINTS.GOALKEEPER_INJURY_BEFORE_75 : POINTS.GOALKEEPER_NO_PLAY_NO_INJURY;
      return goalkeeperGoalsConcededScore(goalsAgainst);
    case "played_full":
      return goalkeeperGoalsConcededScore(goalsAgainst);
  }
}

export async function getEnrichedRankings(): Promise<EnrichedRankings> {
  const empty: EnrichedRankings = { killerMundial: [], killerSeleccion: [], topGoalkeepers: [] };

  try {
  // Respect score-override priority: use getMatchesWithLiveScores() to get the
  // confirmed-finished match list (admin overrides applied). Then fetch FDO details
  // only for matches that appear in both the confirmed list and the FDO recent list.
  // Both getLiveWCMatches/getRecentWCMatches are fetch-cached and deduplicated.
  const [liveMatches, recentMatches, confirmedMatches] = await Promise.all([
    getLiveWCMatches(),
    getRecentWCMatches(2),
    getMatchesWithLiveScores(),
  ]);

  // Build confirmed-finished static team pairs (override-respecting)
  const confirmedPairs = new Set(
    confirmedMatches
      .filter((m) => m.homeScore !== null)
      .map((m) => `${m.homeTeam}|${m.awayTeam}`)
  );

  const liveIds = new Set(liveMatches.map((m) => m.id));
  const allFdoMatches: FdoMatchSummary[] = [
    ...liveMatches,
    ...recentMatches.filter((m) => !liveIds.has(m.id)),
  ];

  // Only fetch details for matches confirmed finished AND present in FDO
  // Cap at 5 to stay safely within 10 req/min (2 list + 1 confirmed + 5 detail = 8)
  const confirmedFdoIds = allFdoMatches
    .filter((m) => {
      if (m.status !== "FINISHED" && m.status !== "IN_PLAY" && m.status !== "PAUSED") return false;
      // Match against confirmed static pairs by team name
      return Array.from(confirmedPairs).some((pair) => {
        const [staticHome, staticAway] = pair.split("|");
        return teamsMatch(m.homeTeam.name, staticHome) && teamsMatch(m.awayTeam.name, staticAway);
      });
    })
    .map((m) => m.id)
    .slice(0, 5);

  if (confirmedFdoIds.length === 0) return empty;

  // Match details — each is fetch-cached at revalidate 60s (shared across all Lambda instances)
  const details = (await Promise.all(confirmedFdoIds.map(getMatchDetail)))
    .filter((d): d is FdoMatchDetail => d !== null);

  if (details.length === 0) return empty;

  // ── Killer goals ──────────────────────────────────────────────────────────
  const uniqueMundial = [...new Set(PARTICIPANTS.map((p) => p.killerMundial))];
  const uniqueSeleccion = [...new Set(PARTICIPANTS.map((p) => p.killerSeleccion))];

  const mundialGoals = new Map<string, number>();
  for (const killer of uniqueMundial) {
    mundialGoals.set(killer, details.reduce((sum, d) => sum + goalsByPlayer(d, killer), 0));
  }

  const seleccionGoals = new Map<string, number>();
  for (const killer of uniqueSeleccion) {
    seleccionGoals.set(killer, details.reduce((sum, d) => sum + goalsByPlayer(d, killer), 0));
  }

  // ── Goalkeeper points ─────────────────────────────────────────────────────
  const uniqueGKs = [...new Set(PARTICIPANTS.map((p) => p.goalkeeper))];
  const gkPoints = new Map<string, number>();

  for (const gkName of uniqueGKs) {
    let total = 0;
    for (const detail of details) {
      if (detail.status !== "FINISHED") continue;

      const homeGK = (detail.homeTeam.lineup ?? []).find((p) => p.position === "Goalkeeper");
      const awayGK = (detail.awayTeam.lineup ?? []).find((p) => p.position === "Goalkeeper");

      let gkTeamId: number | null = null;
      if (homeGK && fuzzyMatchGK(homeGK.name, gkName)) gkTeamId = detail.homeTeam.id;
      else if (awayGK && fuzzyMatchGK(awayGK.name, gkName)) gkTeamId = detail.awayTeam.id;
      if (gkTeamId === null) continue;

      const rawEvent = analyzeGKEvents(detail, gkName, gkTeamId);
      let event: GoalkeeperMatchEvent;
      if (rawEvent.type === "red_card" && rawEvent.minute !== undefined) {
        event = { type: "red_card", minute: rawEvent.minute };
      } else if (rawEvent.type === "substituted" && rawEvent.minute !== undefined) {
        event = { type: "substituted", minute: rawEvent.minute, injury: false };
      } else if (rawEvent.type === "not_played") {
        event = { type: "not_played", injury: false };
      } else {
        event = { type: "played_full" };
      }

      total += gkEventPoints(event, goalsAgainstTeam(detail, gkTeamId));
    }
    gkPoints.set(gkName, total);
  }

  return {
    killerMundial: [...mundialGoals.entries()]
      .map(([name, goals]) => ({ name, goals }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5),
    killerSeleccion: [...seleccionGoals.entries()]
      .map(([name, goals]) => ({ name, goals }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5),
    topGoalkeepers: [...gkPoints.entries()]
      .map(([name, pts]) => ({ name, pts }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 5),
  };
  } catch {
    return empty;
  }
}
