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

export interface FdoMatchDetail extends FdoMatchSummary {
  homeTeam: FdoTeamRef & { lineup: FdoLineupPlayer[]; bench: FdoLineupPlayer[] };
  awayTeam: FdoTeamRef & { lineup: FdoLineupPlayer[]; bench: FdoLineupPlayer[] };
  goals: FdoGoal[];
  bookings: FdoBooking[];
  substitutions: FdoSubstitution[];
}

// ─────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────

/** Get all live + today's World Cup matches */
export async function getLiveWCMatches(): Promise<FdoMatchSummary[]> {
  if (!hasToken()) return [];
  try {
    const res = await fetch(`${BASE_URL}/competitions/WC/matches?status=LIVE`, {
      headers: apiHeaders(),
      next: { revalidate: 0 },
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
      { headers: apiHeaders(), next: { revalidate: 0 } }
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
      { headers: apiHeaders(), next: { revalidate: 0 } }
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
      next: { revalidate: 0 },
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
  lineup: FdoLineupPlayer[],
  gkName: string
): FdoLineupPlayer | null {
  // First try by position
  const gkByPosition = lineup.find(
    (p) => p.position === "Goalkeeper"
  );

  if (gkByPosition) {
    // Verify it's the participant's chosen GK (fuzzy name match)
    const nameLower = gkName.toLowerCase();
    const apiNameLower = gkByPosition.name.toLowerCase();
    const firstWord = nameLower.split(" ")[0];
    if (
      apiNameLower.includes(firstWord) ||
      nameLower.includes(apiNameLower.split(" ")[0])
    ) {
      return gkByPosition;
    }
    // Different GK started — still return it so we know who played
    return gkByPosition;
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
  // Find the GK in the starting lineup for this team
  const teamLineup = match.homeTeam.id === teamId
    ? match.homeTeam.lineup
    : match.awayTeam.lineup;

  const gk = extractGKFromLineup(teamLineup, gkName);

  if (!gk) {
    // Check bench — if in bench, not played
    return { type: "not_played" };
  }

  const nameLower = gk.name.toLowerCase();

  // Check for red card
  const redCard = match.bookings.find(
    (b) =>
      b.team.id === teamId &&
      (b.card === "RED_CARD" || b.card === "YELLOW_RED_CARD") &&
      b.player.name.toLowerCase().includes(nameLower.split(" ")[0]) ||
      nameLower.includes(b.player.name.toLowerCase().split(" ")[0])
  );

  if (redCard) {
    return { type: "red_card", minute: redCard.minute };
  }

  // Check for substitution (GK coming off)
  const sub = match.substitutions.find(
    (s) =>
      s.team.id === teamId &&
      (s.playerOut.name.toLowerCase().includes(nameLower.split(" ")[0]) ||
       nameLower.includes(s.playerOut.name.toLowerCase().split(" ")[0]))
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
  return match.goals.filter(
    (g) =>
      g.type !== "PENALTY" &&
      g.team.id !== teamId  // goals scored by the OTHER team against this team
  ).length;
}

/**
 * Get goals scored by a specific player (by name, fuzzy match).
 * Excludes penalties.
 * Used for killer scoring.
 */
export function goalsByPlayer(
  match: FdoMatchDetail,
  playerName: string
): number {
  const nameLower = playerName.toLowerCase();
  const firstWord = nameLower.split(" ")[0];
  return match.goals.filter(
    (g) =>
      g.type !== "PENALTY" &&
      g.scorer !== null &&
      (g.scorer.name.toLowerCase().includes(firstWord) ||
       firstWord.includes(g.scorer.name.toLowerCase().split(" ")[0]))
  ).length;
}

/**
 * Map football-data.org status to our internal Fixture status
 */
export function mapFdoStatus(
  status: string,
  score: FdoScore
): "NS" | "1H" | "HT" | "2H" | "ET" | "FT" | "AET" | "PEN" | "CANC" {
  switch (status) {
    case "FINISHED":
      if (score.duration === "PENALTY_SHOOTOUT") return "PEN";
      if (score.duration === "EXTRA_TIME") return "AET";
      return "FT";
    case "IN_PLAY": return "1H"; // simplified — no half info in summary
    case "PAUSED": return "HT";
    case "CANCELLED":
    case "POSTPONED":
      return "CANC";
    default:
      return "NS";
  }
}

export function isAvailable(): boolean {
  return hasToken();
}
