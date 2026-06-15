/**
 * Returns MATCHES with the most up-to-date scores available.
 *
 * Priority:
 *   1. Admin overrides (manual, highest priority — stored in process memory, low write frequency)
 *   2. FDO live scores via Next.js fetch cache (revalidate: 60s, shared across all Lambda instances)
 *   3. Static MATCHES values
 *
 * The fetch cache is the key improvement: Next.js stores the FDO HTTP response at
 * the edge (Vercel Data Cache), shared between all serverless instances — no Redis needed.
 */
import { MATCHES } from "./participants";
import { applyOverrides } from "./score-overrides";
import { getLiveWCMatches, getRecentWCMatches, normStr } from "./football-data-org";
import type { FdoMatchSummary } from "./football-data-org";
import type { MatchWithScore } from "./types";

export type { MatchWithScore };

export function teamsMatch(fdoName: string, staticName: string): boolean {
  const fdo = normStr(fdoName);
  const sta = normStr(staticName);
  if (fdo === sta || fdo.includes(sta) || sta.includes(fdo)) return true;
  const aliases: Record<string, string> = {
    "brazil": "brasil",
    "morocco": "marruecos",
    "france": "francia",
    "spain": "espana",
    "germany": "alemania",
    "netherlands": "paises bajos",
    "switzerland": "suiza",
    "turkey": "turquia",
    "south korea": "corea del sur",
    "korea republic": "corea del sur",
    "czechia": "chequia",
    "czech republic": "chequia",
    "south africa": "sudafrica",
    "haiti": "haiti",
    "united states": "estados unidos",
    "ivory coast": "costa de marfil",
    "scotland": "escocia",
    "sweden": "suecia",
    "canada": "canada",
    "ecuador": "ecuador",
    "japan": "japon",
    "tunisia": "tunez",
    "curacao": "curazao",
    "qatar": "catar",
    "bosnia and herzegovina": "bosnia y herzegovina",
    "bosnia-herzegovina": "bosnia y herzegovina",
    "mexico": "mexico",
    "argentina": "argentina",
    "australia": "australia",
    "paraguay": "paraguay",
    "portugal": "portugal",
    "england": "inglaterra",
    "croatia": "croacia",
    "senegal": "senegal",
    "colombia": "colombia",
    "uruguay": "uruguay",
    "belgium": "belgica",
    "egypt": "egipto",
    "cape verde": "cabo verde",
    "new zealand": "nueva zelanda",
    "iran": "iran",
    "saudi arabia": "arabia saudita",
    "iraq": "irak",
    "norway": "noruega",
    "algeria": "argelia",
    "austria": "austria",
    "jordan": "jordania",
    "congo dr": "rd congo",
    "dr congo": "rd congo",
    "uzbekistan": "uzbekistan",
    "ghana": "ghana",
    "panama": "panama",
  };
  const fdoAlias = aliases[fdo] ?? fdo;
  return fdoAlias === sta || sta.includes(fdoAlias) || fdoAlias.includes(sta);
}

export async function getMatchesWithLiveScores(): Promise<MatchWithScore[]> {
  // Apply admin overrides first (may already fill some scores)
  const withAdmin = applyOverrides(MATCHES);

  // Check if any group-stage matches still need live scores
  const nullMatches = withAdmin.filter(
    (m) =>
      m.homeScore === null &&
      !m.homeTeam.toUpperCase().includes("OCTAVO") &&
      !m.homeTeam.toUpperCase().includes("ACERTAR")
  );

  if (nullMatches.length === 0) return withAdmin;

  // Fetch from FDO — Next.js caches this response for 60s across all instances
  try {
    const [liveMatches, recentMatches] = await Promise.all([
      getLiveWCMatches(),       // revalidate: 30s
      getRecentWCMatches(2),    // revalidate: 60s
    ]);

    const liveIds = new Set(liveMatches.map((m) => m.id));
    const allFdo: FdoMatchSummary[] = [
      ...liveMatches,
      ...recentMatches.filter((m) => !liveIds.has(m.id)),
    ];

    const relevant = allFdo.filter(
      (m) => m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED"
    );
    if (relevant.length === 0) return withAdmin;

    // Merge FDO scores into a map: staticId ? { homeScore, awayScore }
    const scoreMap = new Map<string, { homeScore: number; awayScore: number }>();

    for (const fdoMatch of relevant) {
      const homeScore =
        fdoMatch.score.fullTime.home ??
        (fdoMatch.status === "PAUSED" ? fdoMatch.score.halfTime.home : null);
      const awayScore =
        fdoMatch.score.fullTime.away ??
        (fdoMatch.status === "PAUSED" ? fdoMatch.score.halfTime.away : null);
      if (homeScore === null || awayScore === null) continue;

      const staticMatch = MATCHES.find(
        (m) =>
          teamsMatch(fdoMatch.homeTeam.name, m.homeTeam) &&
          teamsMatch(fdoMatch.awayTeam.name, m.awayTeam)
      );
      if (staticMatch) {
        scoreMap.set(staticMatch.id, { homeScore, awayScore });
      }
    }

    // Apply FDO scores on top of admin overrides
    return withAdmin.map((m) => {
      if (m.homeScore !== null) return m; // admin override already set
      const fdoScore = scoreMap.get(m.id);
      if (!fdoScore) return m;
      return { ...m, ...fdoScore };
    });
  } catch {
    return withAdmin;
  }
}
