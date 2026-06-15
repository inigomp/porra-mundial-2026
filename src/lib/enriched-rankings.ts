/**
 * Computes real tournament rankings using FDO API:
 *  - killerMundial / killerSeleccion: top scorers from getWCTopScorers()
 *  - topGoalkeepers: GKs from actual match lineups via getFinishedMatchDetail()
 *
 * Finished match details are CDN-cached with revalidate: 3600 (immutable once done).
 * All fetch() calls use next.revalidate — shared across Vercel Lambda instances.
 */

import {
  getAllFinishedWCMatches,
  getFinishedMatchDetail,
  getWCTopScorers,
  normStr,
} from "./football-data-org";
import { goalkeeperGoalsConcededScore } from "./scoring-engine";
import type { KillerRankEntry, GkRankEntry, EnrichedRankings } from "./types";
export type { KillerRankEntry, GkRankEntry, EnrichedRankings };

/** Spanish forwards shown when Spain hasn't scored yet */
const SPAIN_FALLBACK_FORWARDS = [
  "Borja Iglesias",
  "Mikel Oyarzabal",
  "Lamine Yamal",
  "Nico Williams",
  "Ferran Torres",
];

/**
 * Core helper: fetch all finished match details in parallel (1h CDN cache)
 * and build a Map of GK name → accumulated points from goals conceded.
 * GK name comes directly from the FDO lineup (position === "Goalkeeper").
 */
async function buildGkTotals(): Promise<Map<string, number>> {
  const finishedMatches = await getAllFinishedWCMatches();
  const details = await Promise.all(
    finishedMatches.map((m) => getFinishedMatchDetail(m.id))
  );

  const gkTotals = new Map<string, number>();
  for (let i = 0; i < finishedMatches.length; i++) {
    const match = finishedMatches[i];
    const detail = details[i];
    if (!detail?.lineups) continue;

    const hs = match.score.fullTime.home ?? 0;
    const as_ = match.score.fullTime.away ?? 0;

    const homeGK = detail.lineups.homeTeam?.startXI?.find(
      (p) => p.position === "Goalkeeper"
    );
    const awayGK = detail.lineups.awayTeam?.startXI?.find(
      (p) => p.position === "Goalkeeper"
    );

    if (homeGK) {
      gkTotals.set(homeGK.name, (gkTotals.get(homeGK.name) ?? 0) + goalkeeperGoalsConcededScore(as_));
    }
    if (awayGK) {
      gkTotals.set(awayGK.name, (gkTotals.get(awayGK.name) ?? 0) + goalkeeperGoalsConcededScore(hs));
    }
  }
  return gkTotals;
}

export async function getEnrichedRankings(): Promise<EnrichedRankings> {
  const empty: EnrichedRankings = { killerMundial: [], killerSeleccion: [], topGoalkeepers: [] };

  try {
    const [topScorers, gkTotals] = await Promise.all([
      getWCTopScorers(100),
      buildGkTotals(),
    ]);

    // ── Killer mundial ───────────────────────────────────────────────────────
    const killerMundial: KillerRankEntry[] = topScorers
      .slice(0, 5)
      .map((s) => ({ name: s.player.name, goals: s.goals }));

    // ── Killer selección ─────────────────────────────────────────────────────
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

    // ── Top 5 porteros ───────────────────────────────────────────────────────
    const topGoalkeepers: GkRankEntry[] = [...gkTotals.entries()]
      .map(([name, pts]) => ({ name, pts }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
      .slice(0, 5);

    return { killerMundial, killerSeleccion, topGoalkeepers };
  } catch {
    return empty;
  }
}

/**
 * Returns the full Map of GK name → accumulated points for all GKs
 * whose team has played at least one finished match.
 * Used by predicciones/[id]/page.tsx as a CDN-cached fallback
 * when the cron cache is empty.
 */
export async function getGoalkeeperPtsMap(): Promise<Map<string, number>> {
  try {
    return await buildGkTotals();
  } catch {
    return new Map();
  }
}
