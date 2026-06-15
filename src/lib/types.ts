// ─────────────────────────────────────────────
// Core domain types for the Porra Mundial 2026
// Scoring engine
// ─────────────────────────────────────────────

export type MatchResult = "home" | "away" | "draw";

export type FixtureStatus =
  | "NS"   // Not started
  | "1H"   // First half
  | "HT"   // Half time
  | "2H"   // Second half
  | "ET"   // Extra time
  | "PEN"  // Penalty shootout
  | "FT"   // Full time
  | "AET"  // After extra time
  | "ABD"; // Abandoned

/** A single match in the tournament */
export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  status: FixtureStatus;
  /** Goals scored in regular time + extra time (NOT penalties) */
  homeScore: number | null;
  awayScore: number | null;
  /** Goals scored in penalty shootout only */
  homePenalties: number | null;
  awayPenalties: number | null;
  /** Minute of last event (for live matches) */
  minute: number | null;
  phase: "groups" | "round_of_16" | "quarter" | "semi" | "third_place" | "final";
}

/** How a player's goalkeeper performed in a single match */
export type GoalkeeperMatchEvent =
  | { type: "played_full" }                           // played 90' (or full match incl. ET)
  | { type: "substituted"; minute: number; injury: boolean }  // substituted
  | { type: "red_card"; minute: number }              // sent off
  | { type: "not_played"; injury: boolean };          // did not feature at all

/** Goals scored by a player's chosen killers (excluding penalties) */
export interface KillerGoals {
  /** Goals by the "killer del mundial" (tournament top scorer chosen) */
  mundialGoals: number;
  /** Goals by the "killer de la selección" (national top scorer chosen) */
  seleccionGoals: number;
}

/** A participant's prediction for a single match */
export interface MatchPrediction {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
}

/** A participant's full entry in the porra */
export interface Participant {
  id: string;
  name: string;
  /** The player they chose as "killer del mundial" */
  killerMundial: string;
  /** The player they chose as "killer de la selección" (their national team) */
  killerSeleccion: string;
  /** The goalkeeper they chose */
  goalkeeper: string;
  /** All match predictions keyed by fixtureId */
  predictions: Record<string, MatchPrediction>;
}

// ─────────────────────────────────────────────
// Scoring breakdown types
// ─────────────────────────────────────────────

export interface MatchPredictionScore {
  fixtureId: string;
  prediction: { home: number; away: number };
  actual: { home: number; away: number };
  points: number;
  /** "exact" | "correct_result_and_diff" | "correct_result" | "miss" */
  outcome: "exact" | "correct_result_and_diff" | "correct_result" | "miss";
}

export interface GoalkeeperMatchScore {
  fixtureId: string;
  goalkeeperName: string;
  event: GoalkeeperMatchEvent;
  goalsAgainst: number | null;
  points: number;
  reason: string;
}

export interface KillerScore {
  killerName: string;
  killerType: "mundial" | "seleccion";
  goals: number;
  pointsPerGoal: number;
  totalPoints: number;
}

export interface ParticipantScoreBreakdown {
  participantId: string;
  participantName: string;
  matchPredictions: MatchPredictionScore[];
  goalkeeperMatches: GoalkeeperMatchScore[];
  killerMundial: KillerScore;
  killerSeleccion: KillerScore;
  totalFromPredictions: number;
  totalFromGoalkeeper: number;
  totalFromKillers: number;
  totalFromPlayoff: number;
  grandTotal: number;
  /** Points from group stage only (for the special mid-tournament prize) */
  groupStageTotal: number;
}

/** Leaderboard entry */
export interface StandingEntry {
  rank: number;
  participantId: string;
  participantName: string;
  points: number;
  groupStagePoints: number;
  exactScores: number;
  correctResults: number;
  lastFive: ("hit" | "miss" | "partial")[];
  winProbability: number;
}

// ─────────────────────────────────────────────
// Enriched rankings types (killer goals + GK pts)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Live scores shared type
// ─────────────────────────────────────────────

export interface MatchWithScore {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

// ─────────────────────────────────────────────
// Playoff prediction scoring
// ─────────────────────────────────────────────

/**
 * Actual results for each playoff slot.
 * Keys match the slot keys in PLAYOFF_SLOTS:
 *   "Xº grupo Y"        → team that finished in that position (group stage)
 *   "OCTAVOFINALISTA N"  → team that won dieciseisavos match N
 *   "CUARTOFINALISTA N"  → team that won octavos match N
 *   "SEMIFINALISTA N"    → team that won cuartos match N
 *   "FINALISTA 1|2"      → both finalists
 *   "TERCER PUESTO"      → 3rd place team
 *   "CAMPEÖN"            → champion
 *
 * Leave a slot undefined/absent until the result is known.
 */
export type PlayoffActuals = Record<string, string>;

/** Score for a single playoff slot prediction */
export interface PlayoffSlotScore {
  slot: string;
  predictedTeam: string;
  actualTeam: string | null;
  points: number;
  /** true if the team qualified (2 pts base) */
  qualified: boolean;
  /** true if the position bonus was earned (+1, only for 1st/2nd place slots) */
  positionBonus: boolean;
}

/** All playoff scores for a participant */
export interface PlayoffScore {
  slots: PlayoffSlotScore[];
  totalPoints: number;
}
