/**
 * API-Football client for Porra Mundial 2026
 * Uses the free tier (100 req/day) from RapidAPI
 *
 * World Cup 2026 league ID: 1 (FIFA World Cup)
 * Season: 2026
 */

const BASE_URL = "https://api-football-v1.p.rapidapi.com/v3";

const headers = {
  "X-RapidAPI-Key": process.env.RAPIDAPI_KEY ?? "",
  "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
};

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

/** Get all live fixtures for the World Cup */
export async function getLiveFixtures(): Promise<ApiFixture[]> {
  if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === "placeholder") {
    return [];
  }
  const res = await fetch(`${BASE_URL}/fixtures?live=all&league=1&season=2026`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.response ?? [];
}

/** Get all fixtures for the World Cup (for syncing results) */
export async function getAllFixtures(season = 2026): Promise<ApiFixture[]> {
  if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === "placeholder") {
    return [];
  }
  const res = await fetch(`${BASE_URL}/fixtures?league=1&season=${season}`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.response ?? [];
}

/** Get lineups for a specific fixture (to identify goalkeepers) */
export async function getFixtureLineups(fixtureId: number): Promise<ApiLineup[]> {
  if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === "placeholder") {
    return [];
  }
  const res = await fetch(`${BASE_URL}/fixtures/lineups?fixture=${fixtureId}`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.response ?? [];
}

/** Get all events for a specific fixture (goals, cards, substitutions) */
export async function getFixtureEvents(fixtureId: number): Promise<ApiEvent[]> {
  if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === "placeholder") {
    return [];
  }
  const res = await fetch(`${BASE_URL}/fixtures/events?fixture=${fixtureId}`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.response ?? [];
}

/** Extract goalkeeper name from lineups */
export function extractGoalkeeper(lineups: ApiLineup[], teamId: number): string | null {
  const lineup = lineups.find((l) => l.team.id === teamId);
  if (!lineup) return null;
  const gk = lineup.startXI.find((p) => p.player.pos === "G");
  return gk?.player.name ?? null;
}

/** Determine goalkeeper match event from events data */
export function analyzeGoalkeeperEvent(
  events: ApiEvent[],
  goalkeeperName: string,
  teamId: number
): { substituted: boolean; minute: number | null; injury: boolean; redCard: boolean } {
  const gkEvents = events.filter(
    (e) =>
      (e.player.name.toLowerCase().includes(goalkeeperName.toLowerCase()) ||
        goalkeeperName.toLowerCase().includes(e.player.name.toLowerCase())) &&
      e.team.id === teamId
  );

  const subEvent = gkEvents.find((e) => e.type === "subst");
  const redCard = gkEvents.some(
    (e) => e.type === "Card" && (e.detail === "Red Card" || e.detail === "Second Yellow Card")
  );

  return {
    substituted: !!subEvent,
    minute: subEvent?.time.elapsed ?? null,
    injury: subEvent?.detail?.toLowerCase().includes("injur") ?? false,
    redCard,
  };
}

/**
 * Goals conceded by a team in a match (excluding penalties)
 * Uses actual goals minus any penalty goals
 */
export function goalsAgainstExcludingPenalties(fixture: ApiFixture, isHomeTeam: boolean): number {
  const regularGoals = isHomeTeam
    ? (fixture.goals.away ?? 0)
    : (fixture.goals.home ?? 0);

  // The goals.home/away already includes ET goals but NOT penalty shootout goals
  // in the API-Football response (penalty score is stored separately in score.penalty)
  return regularGoals;
}
