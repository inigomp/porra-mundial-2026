/**
 * Football-Data.org client for Porra Mundial 2026
 *
 * FREE FOREVER for World Cup — register at: https://www.football-data.org/client/register
 * Add your token to .env.local as: FOOTBALL_DATA_ORG_TOKEN=your_token_here
 *
 * Free tier: 10 requests/minute (sufficient for polling every 6 seconds during live matches)
 * World Cup competition code: WC (id: 2000)
 *
 * Key endpoints used:
 *   GET /v4/competitions/WC/matches      → all WC matches (filter by date/status)
 *   GET /v4/matches/{id}                 → full detail: goals, lineups, bookings, substitutions
 */

const BASE_URL = "https://api.football-data.org/v4";

function apiHeaders(): HeadersInit {
  return {
    "X-Auth-Token": process.env.FOOTBALL_DATA_ORG_TOKEN ?? "",
  };
}

function hasToken(): boolean {
  return !!(
    process.env.FOOTBALL_DATA_ORG_TOKEN &&
    process.env.FOOTBALL_DATA_ORG_TOKEN !== "your_token_here" &&
    process.env.FOOTBALL_DATA_ORG_TOKEN.length > 5
  );
}

// ─────────────────────────────────────────────
// API response types
// ─────────────────────────────────────────────

export interface FdoTeamRef {
  id: number;
  name: string;
  shortName?: string;
  crest?: string;
}

export interface FdoScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface FdoGoal {
  minute: number;
  injuryTime: number | null;
  /** "REGULAR" | "EXTRA_TIME" | "PENALTY" | "OWN" */
  type: "REGULAR" | "EXTRA_TIME" | "PENALTY" | "OWN";
  team: FdoTeamRef;
  scorer: { id: number; name: string } | null;
  assist: { id: number; name: string } | null;
}

export interface FdoBooking {
  minute: number;
  team: FdoTeamRef;
  player: { id: number; name: string };
  /** "YELLOW_CARD" | "RED_CARD" | "YELLOW_RED_CARD" */
  card: "YELLOW_CARD" | "RED_CARD" | "YELLOW_RED_CARD";
}

export interface FdoSubstitution {
  minute: number;
  team: FdoTeamRef;
  playerOut: { id: number; name: string };
  playerIn: { id: number; name: string };
}

export interface FdoLineupPlayer {
  id: number;
  name: string;
  /** "Goalkeeper" | "Defender" | "Midfielder" | "Offence" */
  position: string;
  shirtNumber: number;
}

export interface FdoLineup {
  formation: string | null;
  startXI: FdoLineupPlayer[];
  bench: FdoLineupPlayer[];
  coach: { id: number; name: string } | null;
}

export interface FdoMatchSummary {
  id: number;
  utcDate: string;
  /** "TIMED" | "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "CANCELLED" */
  status: string;
  minute?: number;
  homeTeam: FdoTeamRef;
  awayTeam: FdoTeamRef;
  score: FdoScore;
}

export interface FdoMatchLineupSide {
  formation: string | null;
  startXI: FdoLineupPlayer[];
  bench: FdoLineupPlayer[];
}

export interface FdoMatchDetail extends FdoMatchSummary {
  /** homeTeam/awayTeam here only carry id/name — lineups are under `lineups` */
  homeTeam: FdoTeamRef;
  awayTeam: FdoTeamRef;
  lineups: {
    homeTeam: FdoMatchLineupSide;
    awayTeam: FdoMatchLineupSide;
  } | null;
  goals: FdoGoal[];
  bookings: FdoBooking[];
  substitutions: FdoSubstitution[];
}

// ─────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Name normalization helpers
// ─────────────────────────────────────────────

/** Lowercase + strip common accents for fuzzy matching */
export function normStr(s: string): string {
  return s.toLowerCase()
    .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i").replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u").replace(/ñ/g, "n").replace(/ç/g, "c");
}

/**
 * Extract matchable surname key from participant player field.
 * "Mbappé (FRA)" → "mbappe"   "Oyarzabal" → "oyarzabal"
 */
export function playerKey(name: string): string {
  return normStr(name.replace(/\s*\([^)]+\)\s*$/, "").trim());
}

/**
 * GK registration alias table — handles mismatches between FDO API name and
 * porra internal name. Key: normStr(porraName), Value: alternative normStr API names.
 * Example: "Bono" registered as "Bounou" in FDO.
 */
export const GK_ALIASES: Record<string, string[]> = {
  "bono": ["bounou"],
  "courtois": ["thibaut courtois"],
  "oblak": ["jan oblak"],
};

/** Get all live + today's World Cup matches */
export async function getLiveWCMatches(): Promise<FdoMatchSummary[]> {
  if (!hasToken()) return [];
  try {
    const res = await fetch(`${BASE_URL}/competitions/WC/matches?status=LIVE`, {
      headers: apiHeaders(),
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.matches ?? [];
  } catch {
    return [];
  }
}

/** Get all World Cup matches for today (ISO date: YYYY-MM-DD) */
export async function getTodayWCMatches(date?: string): Promise<FdoMatchSummary[]> {
  if (!hasToken()) return [];
  try {
    const today = date ?? new Date().toISOString().split("T")[0];
    const res = await fetch(
      `${BASE_URL}/competitions/WC/matches?dateFrom=${today}&dateTo=${today}`,
      { headers: apiHeaders(), next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.matches ?? [];
  } catch {
    return [];
  }
}

/**
 * Get recent WC matches (last N days + today).
 * Used to catch matches that started near midnight UTC and fall on "yesterday".
 */
export async function getRecentWCMatches(daysBack = 2): Promise<FdoMatchSummary[]> {
  if (!hasToken()) return [];
  try {
    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - daysBack);
    const dateFrom = from.toISOString().split("T")[0];
    const dateTo = now.toISOString().split("T")[0];
    const res = await fetch(
      `${BASE_URL}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: apiHeaders(), next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.matches ?? [];
  } catch {
    return [];
  }
}

/** Get full match detail including lineup, goals, bookings, substitutions */
export async function getMatchDetail(matchId: number): Promise<FdoMatchDetail | null> {
  if (!hasToken()) return null;
  try {
    const res = await fetch(`${BASE_URL}/matches/${matchId}`, {
      headers: apiHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

/**
 * Extract goalkeeper from a lineup.
 * Returns null if not found.
 */
export function extractGKFromLineup(
  lineup: FdoLineupPlayer[] | null | undefined,
  gkName: string
): FdoLineupPlayer | null {
  const porraKey = playerKey(gkName);
  const aliases = GK_ALIASES[porraKey] ?? [];

  // Find goalkeeper by position first
  const gkByPosition = (lineup ?? []).find(
    (p) => p.position === "Goalkeeper"
  );

  if (gkByPosition) {
    const apiKey = normStr(gkByPosition.name);
    const matches =
      apiKey.includes(porraKey) || porraKey.includes(apiKey) ||
      aliases.some((a) => apiKey.includes(a) || a.includes(apiKey));
    // Return regardless of match — we need to know who played regardless
    if (matches || (lineup ?? []).filter((p) => p.position === "Goalkeeper").length === 1) {
      return gkByPosition;
    }
  }
  return null;
}

/**
 * Determine goalkeeper event for scoring:
 *
 * Returns:
 *   { type: "played_full" }                            → played full match
 *   { type: "substituted", minute, injury: false }     → subbed out (no injury info available)
 *   { type: "red_card", minute }                       → red carded
 *   { type: "not_played" }                             → GK not in lineup
 */
export function analyzeGKEvents(
  match: FdoMatchDetail,
  gkName: string,
  teamId: number
): { type: "played_full" | "substituted" | "red_card" | "not_played"; minute?: number; injury?: boolean } {
  // lineups.homeTeam.startXI / lineups.awayTeam.startXI (FDO v4 structure)
  const side = match.homeTeam.id === teamId ? "homeTeam" : "awayTeam";
  const teamLineup = match.lineups?.[side]?.startXI ?? [];

  const gk = extractGKFromLineup(teamLineup, gkName);

  if (!gk) {
    // Check bench — if in bench, not played
    return { type: "not_played" };
  }

  const gkKey = playerKey(gkName);
  const aliases = GK_ALIASES[gkKey] ?? [];

  function gkMatches(playerName: string): boolean {
    const key = normStr(playerName);
    return key.includes(gkKey) || gkKey.includes(key) ||
      aliases.some((a) => key.includes(a) || a.includes(key));
  }

  // Check for red card
  const redCard = (match.bookings ?? []).find(
    (b) =>
      b.team.id === teamId &&
      (b.card === "RED_CARD" || b.card === "YELLOW_RED_CARD") &&
      gkMatches(b.player.name)
  );

  if (redCard) {
    return { type: "red_card", minute: redCard.minute };
  }

  // Check for substitution (GK coming off)
  const sub = (match.substitutions ?? []).find(
    (s) =>
      s.team.id === teamId &&
      gkMatches(s.playerOut.name)
  );

  if (sub) {
    return { type: "substituted", minute: sub.minute, injury: false };
  }

  return { type: "played_full" };
}

/**
 * Count non-penalty goals against a team in a match.
 * Excludes: PENALTY type goals.
 * Includes: REGULAR, EXTRA_TIME, OWN goals.
 */
export function goalsAgainstTeam(match: FdoMatchDetail, teamId: number): number {
  return (match.goals ?? []).filter(
    (g) =>
      g.type !== "PENALTY" &&
      g.team.id !== teamId  // goals scored by the OTHER team against this team
  ).length;
}

/**
 * Get goals scored by a specific player (by name, fuzzy match).
 * Excludes penalties. Normalizes accents and strips country code.
 * "Mbappé (FRA)" → key "mbappe", matches "Kylian Mbappé" from FDO.
 */
export function goalsByPlayer(
  match: FdoMatchDetail,
  playerName: string
): number {
  const key = playerKey(playerName);
  return (match.goals ?? []).filter((g) => {
    if (g.type === "PENALTY" || !g.scorer) return false;
    const scorerWords = normStr(g.scorer.name).split(/\s+/);
    return scorerWords.some(
      (w) => w === key ||
        (w.length > 3 && key.startsWith(w)) ||
        (key.length > 3 && w.startsWith(key))
    );
  }).length;
}

export interface FdoScorer {
  player: { id: number; name: string };
  team: FdoTeamRef;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

/** Top scorers for the WC (single API call, covers full tournament) */
export async function getWCTopScorers(limit = 10): Promise<FdoScorer[]> {
  if (!hasToken()) return [];
  try {
    const res = await fetch(`${BASE_URL}/competitions/WC/scorers?limit=${limit}`, {
      headers: apiHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.scorers ?? [];
  } catch {
    return [];
  }
}

/**
 * Returns non-penalty goals scored by a player name (porra format: "Gyökeres (SUE)")
 * across the full WC tournament. Uses the scorers endpoint (CDN-cached, shared across
 * all Lambda instances). Returns 0 if player not found or token unavailable.
 */
export async function getKillerGoals(playerName: string): Promise<number> {
  const scorers = await getWCTopScorers(100);
  const key = playerKey(playerName);
  const entry = scorers.find((s) => {
    const apiKey = normStr(s.player.name);
    const apiWords = apiKey.split(/\s+/);
    return apiKey.includes(key) || apiWords.some((w) => w === key);
  });
  if (!entry) return 0;
  return Math.max(0, entry.goals - (entry.penalties ?? 0));
}

/**
 * Returns non-penalty goals for multiple players in a single API call.
 * Efficient version for when you need to look up many players at once.
 */
export async function getKillerGoalsBatch(
  playerNames: string[]
): Promise<Map<string, number>> {
  const scorers = await getWCTopScorers(100);
  const result = new Map<string, number>();
  for (const name of playerNames) {
    const key = playerKey(name);
    const entry = scorers.find((s) => {
      const apiKey = normStr(s.player.name);
      const apiWords = apiKey.split(/\s+/);
      return apiKey.includes(key) || apiWords.some((w) => w === key);
    });
    result.set(name, entry ? Math.max(0, entry.goals - (entry.penalties ?? 0)) : 0);
  }
  return result;
}

/** All finished WC matches since tournament start */
export async function getAllFinishedWCMatches(): Promise<FdoMatchSummary[]> {
  if (!hasToken()) return [];
  try {
    const res = await fetch(`${BASE_URL}/competitions/WC/matches?status=FINISHED`, {
      headers: apiHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.matches ?? [];
  } catch {
    return [];
  }
}

/**
 * Map football-data.org status to our internal Fixture status
 */
export function mapFdoStatus(
  status: string,
  score: FdoScore
): "NS" | "1H" | "HT" | "2H" | "ET" | "FT" | "AET" | "PEN" | "ABD" {
  switch (status) {
    case "FINISHED":
      if (score.duration === "PENALTY_SHOOTOUT") return "PEN";
      if (score.duration === "EXTRA_TIME") return "AET";
      return "FT";
    case "IN_PLAY": return "1H"; // simplified — no half info in summary
    case "PAUSED": return "HT";
    case "CANCELLED":
    case "POSTPONED":
      return "ABD";
    default:
      return "NS";
  }
}

export function isAvailable(): boolean {
  return hasToken();
}
