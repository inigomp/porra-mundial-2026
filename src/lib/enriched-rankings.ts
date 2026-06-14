/**
 * Computes real tournament rankings:
 *  - killerMundial: top scorers from getWCTopScorers() — covers full WC
 *  - killerSeleccion: goals by Spanish players from match details;
 *    falls back to 5 Spanish forwards with 0 goals until Spain plays
 *  - topGoalkeepers: retrospective pts for every GK that played in a
 *    finished match (not limited to porra participants)
 *
 * All fetch() calls use next.revalidate — shared across Vercel Lambda instances
 * via Vercel Data Cache (no in-process Maps). API calls are capped at 10 match
 * details to stay within FDO's 10 req/min free tier.
 */

import {
  getAllFinishedWCMatches,
  getMatchDetail,
  getWCTopScorers,
  analyzeGKEvents,
  goalsAgainstTeam,
  normStr,
  type FdoMatchDetail,
} from "./football-data-org";
import { goalkeeperGoalsConcededScore } from "./scoring-engine";
import { POINTS } from "./scoring-engine";
import type { GoalkeeperMatchEvent, KillerRankEntry, GkRankEntry, EnrichedRankings } from "./types";
export type { KillerRankEntry, GkRankEntry, EnrichedRankings };

/** Spanish forwards shown when Spain hasn't scored yet */
const SPAIN_FALLBACK_FORWARDS = [
  "Borja Iglesias",
  "Mikel Oyarzabal",
  "Lamine Yamal",
  "Nico Williams",
  "Ferran Torres",
];

function isSpain(teamName: string): boolean {
  const n = normStr(teamName);
  return n === "spain" || n.includes("espana") || n.includes("spain");
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
    // 2 API calls in parallel — stays safely within 10 req/min on cold start
    // (10 req/min budget: 2 list + 7 detail = 9 total)
    const [topScorers, finishedMatches] = await Promise.all([
      getWCTopScorers(10),
      getAllFinishedWCMatches(),
    ]);

    // ── Killer mundial ───────────────────────────────────────────────────────
    // Scorers API covers the full tournament — no need to aggregate per-match
    const killerMundial: KillerRankEntry[] = topScorers
      .slice(0, 5)
      .map((s) => ({ name: s.player.name, goals: s.goals }));

    // ── Fetch match details (GK retrospective + Spain goals) ─────────────────
    // Take the 7 most recent finished matches; cap strictly at 7 to stay under rate limit
    const detailIds = finishedMatches
      .slice() // don't mutate
      .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
      .slice(0, 7)
      .map((m) => m.id);

    const details: FdoMatchDetail[] = detailIds.length > 0
      ? (await Promise.all(detailIds.map(getMatchDetail)))
          .filter((d): d is FdoMatchDetail => d !== null)
      : [];

    // ── Killer selección ─────────────────────────────────────────────────────
    const spainGoals = new Map<string, number>();
    for (const detail of details) {
      const spainTeamId =
        isSpain(detail.homeTeam.name) ? detail.homeTeam.id :
        isSpain(detail.awayTeam.name) ? detail.awayTeam.id :
        null;
      if (spainTeamId === null) continue;
      for (const goal of (detail.goals ?? [])) {
        if (goal.type === "OWN" || !goal.scorer) continue;
        if (goal.team.id !== spainTeamId) continue;
        const name = goal.scorer.name;
        spainGoals.set(name, (spainGoals.get(name) ?? 0) + 1);
      }
    }

    const killerSeleccion: KillerRankEntry[] = spainGoals.size > 0
      ? [...spainGoals.entries()]
          .map(([name, goals]) => ({ name, goals }))
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 5)
      : SPAIN_FALLBACK_FORWARDS.map((name) => ({ name, goals: 0 }));

    // ── GK retrospective — ALL GKs from finished matches ────────────────────
    const gkTotals = new Map<string, number>();
    for (const detail of details) {
      if (detail.status !== "FINISHED") continue;

      const sides = [
        { lineup: detail.homeTeam.lineup ?? [], teamId: detail.homeTeam.id },
        { lineup: detail.awayTeam.lineup ?? [], teamId: detail.awayTeam.id },
      ];

      for (const { lineup, teamId } of sides) {
        const gk = lineup.find((p) => p.position === "Goalkeeper");
        if (!gk) continue;

        // analyzeGKEvents handles sub/red-card/full-game detection
        const rawEvent = analyzeGKEvents(detail, gk.name, teamId);
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

        const ga = goalsAgainstTeam(detail, teamId);
        const pts = gkEventPoints(event, ga);
        gkTotals.set(gk.name, (gkTotals.get(gk.name) ?? 0) + pts);
      }
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
