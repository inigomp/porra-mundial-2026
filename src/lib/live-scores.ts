/**
 * Returns MATCHES with the most up-to-date scores available.
 *
 * Priority:
 *   1. Admin overrides (manual, highest priority)
 *   2. FDO synced scores (written by cron, in-process cache)
 *   3. FDO direct API call for today's matches (fallback when cron hasn't run yet)
 *   4. Static MATCHES values
 */
import { MATCHES } from "./participants";
import { applyOverrides, setSyncedScoresBulk } from "./score-overrides";
import { getLiveWCMatches, getRecentWCMatches } from "./football-data-org";
import type { FdoMatchSummary } from "./football-data-org";

export type MatchWithScore = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

function normalize(name: string): string {
  return name.toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n")
    .replace(/ü/g, "u");
}

function teamsMatch(fdoName: string, staticName: string): boolean {
  const fdo = normalize(fdoName);
  const sta = normalize(staticName);
  // Exact or contains
  if (fdo === sta || fdo.includes(sta) || sta.includes(fdo)) return true;
  // Common aliases
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
  };
  const fdoAlias = aliases[fdo] ?? fdo;
  return fdoAlias === sta || sta.includes(fdoAlias) || fdoAlias.includes(sta);
}

export async function getMatchesWithLiveScores(): Promise<MatchWithScore[]> {
  // Start with static + any cached scores (admin + cron)
  const withCached = applyOverrides(MATCHES);

  // Check if any of today's static null-score matches need refreshing via API
  const nullMatches = withCached.filter(
    (m) =>
      m.homeScore === null &&
      !m.homeTeam.toUpperCase().includes("OCTAVO") &&
      !m.homeTeam.toUpperCase().includes("ACERTAR")
  );

  if (nullMatches.length === 0) return withCached;

  // Try to fill nulls from FDO API: live first (most accurate), then today's
  try {
    const [liveMatches, recentMatches] = await Promise.all([
      getLiveWCMatches(),
      getRecentWCMatches(2),
    ]);

    // Merge: live takes priority over recent (live has real-time scores)
    const liveIds = new Set(liveMatches.map((m) => m.id));
    const allFdo: FdoMatchSummary[] = [
      ...liveMatches,
      ...recentMatches.filter((m) => !liveIds.has(m.id)),
    ];

    const relevant = allFdo.filter(
      (m) => m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED"
    );
    if (relevant.length === 0) return withCached;

    const now = new Date().toISOString();
    const newScores: { fixtureId: string; homeScore: number; awayScore: number; updatedAt: string }[] = [];

    for (const fdoMatch of relevant) {
      // For live matches, use fullTime (FDO populates it in real-time on paid tier)
      // Fall back to halfTime for paused matches
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
      if (!staticMatch) continue;

      newScores.push({ fixtureId: staticMatch.id, homeScore, awayScore, updatedAt: now });
    }

    if (newScores.length > 0) {
      setSyncedScoresBulk(newScores);
    }
  } catch {
    // API unavailable — return cached
  }

  return applyOverrides(MATCHES);
}
