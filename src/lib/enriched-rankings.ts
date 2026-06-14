/**
 * Computes killer goals and GK points rankings directly from the FDO fetch cache.
 *
 * Unlike the standings-cache (in-process Map, one Lambda instance only), this
 * uses fetch() calls with next.revalidate — shared across all Vercel Lambda instances
 * via Vercel Data Cache. Works on every cold-start without needing the cron.
 */

import { PARTICIPANTS } from "./participants";
import {
  getLiveWCMatches,
  getRecentWCMatches,
  getMatchDetail,
  goalsByPlayer,
  analyzeGKEvents,
  goalsAgainstTeam,
  type FdoMatchDetail,
} from "./football-data-org";
import { goalkeeperGoalsConcededScore } from "./scoring-engine";
import { POINTS } from "./scoring-engine";
import type { GoalkeeperMatchEvent } from "./types";

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i").replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u").replace(/ñ/g, "n").replace(/ç/g, "c");
}

/** Fuzzy match between FDO API name and porra name (strips country code) */
function fuzzyMatch(apiName: string, porraName: string): boolean {
  const api = norm(apiName).split(/\s+/);
  const porra = norm(porraName.replace(/\s*\([^)]+\)$/, "")).split(/\s+/).filter((w) => w.length > 2);
  return porra.some((w) => api.some((a) => a.includes(w) || w.includes(a)));
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

export interface KillerRankEntry {
  name: string;
  goals: number;
}

export interface GkRankEntry {
  name: string;
  pts: number;
}

export interface EnrichedRankings {
  killerMundial: KillerRankEntry[];
  killerSeleccion: KillerRankEntry[];
  topGoalkeepers: GkRankEntry[];
}

export async function getEnrichedRankings(): Promise<EnrichedRankings> {
  const empty: EnrichedRankings = { killerMundial: [], killerSeleccion: [], topGoalkeepers: [] };

  // All recent WC matches — both calls are fetch-cached (revalidate 30s / 60s)
  const [liveMatches, recentMatches] = await Promise.all([
    getLiveWCMatches(),
    getRecentWCMatches(7),
  ]);

  const liveIds = new Set(liveMatches.map((m) => m.id));
  const allMatches = [
    ...liveMatches,
    ...recentMatches.filter((m) => !liveIds.has(m.id)),
  ];

  const finishedIds = allMatches
    .filter((m) => m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED")
    .map((m) => m.id);

  if (finishedIds.length === 0) return empty;

  // Match details — each is fetch-cached at revalidate 60s (shared across all Lambda instances)
  const details = (await Promise.all(finishedIds.map(getMatchDetail)))
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

      const homeGK = detail.homeTeam.lineup.find((p) => p.position === "Goalkeeper");
      const awayGK = detail.awayTeam.lineup.find((p) => p.position === "Goalkeeper");

      let gkTeamId: number | null = null;
      if (homeGK && fuzzyMatch(homeGK.name, gkName)) gkTeamId = detail.homeTeam.id;
      else if (awayGK && fuzzyMatch(awayGK.name, gkName)) gkTeamId = detail.awayTeam.id;
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
}
