/**
 * Computes real tournament rankings using only 2 FDO API calls:
 *  - killerMundial: top scorers from getWCTopScorers()
 *  - killerSeleccion: Spanish players from getWCTopScorers(100) filtered by team
 *  - topGoalkeepers: GKs predicted by porra participants, scored from match-list
 *    scores (no detail API calls needed — free tier doesn't return lineups/goals)
 *
 * All fetch() calls use next.revalidate — shared across Vercel Lambda instances
 * via Vercel Data Cache (no in-process Maps).
 */

import {
  getAllFinishedWCMatches,
  getWCTopScorers,
  normStr,
} from "./football-data-org";
import { goalkeeperGoalsConcededScore } from "./scoring-engine";
import type { KillerRankEntry, GkRankEntry, EnrichedRankings } from "./types";
import { PARTICIPANTS } from "./participants";
export type { KillerRankEntry, GkRankEntry, EnrichedRankings };

/** Map porra country codes (Spanish abbreviations) → FDO English team name */
const GK_CODE_TO_FDO: Record<string, string> = {
  ESP: "Spain",
  FRA: "France",
  ARG: "Argentina",
  BEL: "Belgium",
  ING: "England",
  POR: "Portugal",
  ECU: "Ecuador",
  ALE: "Germany",
  BRA: "Brazil",
  MAR: "Morocco",
  JAP: "Japan",
  NLD: "Netherlands",
  SUE: "Sweden",
  NOR: "Norway",
};

/** Extract "COD" from "Name (COD)" */
function parseGkCode(gk: string): string | null {
  const m = gk.match(/\(([A-Z]+)\)$/);
  return m ? m[1] : null;
}

/** Spanish forwards shown when Spain hasn't scored yet */
const SPAIN_FALLBACK_FORWARDS = [
  "Borja Iglesias",
  "Mikel Oyarzabal",
  "Lamine Yamal",
  "Nico Williams",
  "Ferran Torres",
];

export async function getEnrichedRankings(): Promise<EnrichedRankings> {
  const empty: EnrichedRankings = { killerMundial: [], killerSeleccion: [], topGoalkeepers: [] };

  try {
    // 2 API calls in parallel — well within 10 req/min free tier
    const [topScorers, finishedMatches] = await Promise.all([
      getWCTopScorers(100),
      getAllFinishedWCMatches(),
    ]);

    // ── Killer mundial ───────────────────────────────────────────────────────
    const killerMundial: KillerRankEntry[] = topScorers
      .slice(0, 5)
      .map((s) => ({ name: s.player.name, goals: s.goals }));

    // ── Killer selección ─────────────────────────────────────────────────────
    // Filter scorers whose team is Spain (FDO returns "Spain" in English)
    const spainScorers = topScorers.filter((s) => {
      const n = normStr(s.team.name);
      return n === "spain" || n.includes("spain");
    });

    const killerSeleccion: KillerRankEntry[] = spainScorers.length > 0
      ? spainScorers
          .map((s) => ({ name: s.player.name, goals: s.goals }))
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 5)
      : SPAIN_FALLBACK_FORWARDS.map((name) => ({ name, goals: 0 }));

    // ── GK retrospective — porra-predicted GKs scored from match list ────────
    // For each finished match, accumulate per-team goals conceded (per match)
    // so we can call goalkeeperGoalsConcededScore(goalsInThatMatch) for each game.

    // team name (FDO English) → list of goals conceded per match played
    const teamMatchGA = new Map<string, number[]>();
    for (const match of finishedMatches) {
      const ht = match.homeTeam.name;
      const at = match.awayTeam.name;
      const hs = match.score.fullTime.home ?? 0;
      const as_ = match.score.fullTime.away ?? 0;

      const homeList = teamMatchGA.get(ht) ?? [];
      homeList.push(as_); // home team conceded away goals
      teamMatchGA.set(ht, homeList);

      const awayList = teamMatchGA.get(at) ?? [];
      awayList.push(hs); // away team conceded home goals
      teamMatchGA.set(at, awayList);
    }

    // Get unique GKs from porra participants
    const uniqueGKs = [...new Set(PARTICIPANTS.map((p) => p.goalkeeper))];

    const gkTotals = new Map<string, number>();
    for (const gkEntry of uniqueGKs) {
      const code = parseGkCode(gkEntry);
      if (!code) continue;
      const fdoTeam = GK_CODE_TO_FDO[code];
      if (!fdoTeam) continue;

      const matchGA = teamMatchGA.get(fdoTeam);
      if (!matchGA || matchGA.length === 0) continue;

      // Assume GK played full each match (can't get lineup data on free tier)
      const pts = matchGA.reduce(
        (sum, ga) => sum + goalkeeperGoalsConcededScore(ga),
        0
      );
      gkTotals.set(gkEntry, pts);
    }

    const topGoalkeepers: GkRankEntry[] = [...gkTotals.entries()]
      .map(([name, pts]) => ({ name, pts }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 5);

    return { killerMundial, killerSeleccion, topGoalkeepers };
  } catch {
    return empty;
  }
}
