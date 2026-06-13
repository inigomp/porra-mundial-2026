/**
 * Free API Live Football Data client for Porra Mundial 2026
 * Host: free-api-live-football-data.p.rapidapi.com
 *
 * Available endpoints:
 *   - football-current-live             → live matches with score + minute
 *   - football-get-matches-by-date      → all matches on a date (YYYYMMDD)
 *   - football-get-all-leagues          → league list with IDs
 *   - football-players-search           → player search
 *
 * World Cup 2026 league IDs: 894791..894798 (one per group/round, all < 895000)
 * Note: lineups/events not available → GK & killer scoring needs manual input.
 */

const BASE_URL = "https://free-api-live-football-data.p.rapidapi.com";

const apiHeaders = () => ({
  "x-rapidapi-key": process.env.RAPIDAPI_KEY ?? "",
  "x-rapidapi-host": "free-api-live-football-data.p.rapidapi.com",
  "Content-Type": "application/json",
});

/** Minimal API types */
export interface ApiLiveMatch {
  id: number;
  leagueId: number;
  time: string;
  home: { id: number; score: number; name: string; longName: string };
  away: { id: number; score: number; name: string; longName: string };
  eliminatedTeamId: number | null;
  statusId: number;
  tournamentStage: string;
  status: {
    utcTime: string;
    halfs?: {
      firstHalfStarted?: string;
      secondHalfStarted?: string;
    };
    periodLength: number;
    finished: boolean;
    started: boolean;
    cancelled: boolean;
    ongoing?: boolean;
    scoreStr: string;
    liveTime?: {
      short: string;
      long: string;
      maxTime: number;
      addedTime: number;
    };
    reason?: { short: string; long: string };
  };
  timeTS: number;
}

/** World Cup leagueId range (group stage through final) */
const WC_LEAGUE_MIN = 894790;
const WC_LEAGUE_MAX = 895000;

function isWorldCupMatch(m: ApiLiveMatch): boolean {
  return m.leagueId >= WC_LEAGUE_MIN && m.leagueId <= WC_LEAGUE_MAX;
}

function hasKey(): boolean {
  return !!(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY !== "placeholder");
}

/** Get all currently live World Cup matches */
export async function getLiveMatches(): Promise<ApiLiveMatch[]> {
  if (!hasKey()) return [];
  try {
    const res = await fetch(`${BASE_URL}/football-current-live`, {
      headers: apiHeaders(),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const all: ApiLiveMatch[] = data?.response?.live ?? [];
    return all.filter(isWorldCupMatch);
  } catch {
    return [];
  }
}

/** Get all World Cup matches on a given date (format: YYYYMMDD, e.g. "20260614") */
export async function getMatchesByDate(date: string): Promise<ApiLiveMatch[]> {
  if (!hasKey()) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/football-get-matches-by-date?date=${date}`,
      { headers: apiHeaders(), next: { revalidate: 0 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const all: ApiLiveMatch[] = data?.response?.matches ?? [];
    return all.filter(isWorldCupMatch);
  } catch {
    return [];
  }
}

/** Get today's World Cup matches (live + scheduled + finished) */
export async function getTodayMatches(): Promise<ApiLiveMatch[]> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return getMatchesByDate(`${yyyy}${mm}${dd}`);
}

/**
 * Map an API live match to a normalised status string
 * compatible with our Fixture.status type
 */
export function mapStatus(
  m: ApiLiveMatch
): "NS" | "1H" | "HT" | "2H" | "ET" | "FT" | "AET" | "PEN" | "CANC" {
  if (m.status.cancelled) return "CANC";
  if (m.status.finished) {
    const reason = m.status.reason?.short ?? "FT";
    if (reason === "Pen") return "PEN";
    if (reason === "AET") return "AET";
    return "FT";
  }
  if (!m.status.started) return "NS";
  if (m.status.liveTime) {
    const min = m.status.liveTime.maxTime;
    // Extra time: maxTime > 90
    if (min > 90) return "ET";
    // Half time: ongoing=false but started=true with no liveTime short
    const shortTime = m.status.liveTime.short ?? "";
    if (shortTime.includes("HT") || shortTime === "") return "HT";
    return m.status.halfs?.secondHalfStarted ? "2H" : "1H";
  }
  return "1H";
}

/** Get current live minute for a match */
export function getLiveMinute(m: ApiLiveMatch): number | null {
  if (!m.status.liveTime) return null;
  // Parse "45'" or "90+3'" style strings
  const raw = m.status.liveTime.short.replace(/[^0-9+]/g, "");
  const parts = raw.split("+");
  const base = parseInt(parts[0] ?? "0", 10);
  const added = parseInt(parts[1] ?? "0", 10);
  return base + added;
}

// NOTE: This API does not expose lineup or event endpoints.
// GK scoring and killer goal scoring requires manual input via the admin UI.
// The exported stubs below allow the cron route to compile without changes.

export interface ApiLineup {
  team: { id: number; name: string };
  startXI: Array<{ player: { id: number; name: string; pos: string; number: number } }>;
  substitutes: Array<{ player: { id: number; name: string; pos: string } }>;
}

export interface ApiEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: "Goal" | "Card" | "subst" | "Var";
  detail: string;
  comments: string | null;
}

/** @deprecated Not available in this API — returns empty array */
export async function getFixtureLineups(_fixtureId: number): Promise<ApiLineup[]> {
  return [];
}

/** @deprecated Not available in this API — returns empty array */
export async function getFixtureEvents(_fixtureId: number): Promise<ApiEvent[]> {
  return [];
}

/** @deprecated Not available in this API */
export function extractGoalkeeper(_lineups: ApiLineup[], _teamId: number): string | null {
  return null;
}

/** @deprecated Not available in this API */
export function analyzeGoalkeeperEvent(
  _events: ApiEvent[],
  _goalkeeperName: string,
  _teamId: number
): { substituted: boolean; minute: number | null; injury: boolean; redCard: boolean } {
  return { substituted: false, minute: null, injury: false, redCard: false };
}

/** Goals conceded by a team in a match */
export function goalsAgainstExcludingPenalties(m: ApiLiveMatch, isHomeTeam: boolean): number {
  return isHomeTeam ? m.away.score : m.home.score;
}

/** Convenience: ApiFixture-compatible shape from an ApiLiveMatch (for scoring engine) */
export interface ApiFixture {
  fixture: {
    id: number;
    status: { short: string; elapsed: number | null };
    date: string;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  league: { round: string };
}

export function toApiFixture(m: ApiLiveMatch): ApiFixture {
  return {
    fixture: {
      id: m.id,
      status: { short: mapStatus(m), elapsed: getLiveMinute(m) },
      date: m.status.utcTime,
    },
    teams: {
      home: { id: m.home.id, name: m.home.name },
      away: { id: m.away.id, name: m.away.name },
    },
    goals: { home: m.home.score, away: m.away.score },
    score: {
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
    league: { round: `Group ${m.leagueId}` },
  };
}
