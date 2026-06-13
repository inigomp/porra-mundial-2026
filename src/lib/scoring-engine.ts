/**
 * Porra Mundial 2026 — Scoring Engine
 *
 * Rules sourced from the official spreadsheet (confirmed):
 *
 * MATCH SCORING (group stage + knockout):
 *   - Exact score (marcador exacto):                  +3 pts
 *   - Correct 1X2 AND correct goal difference:        +2 pts
 *   - Correct 1X2 only (signo correcto):              +1 pt
 *   - Wrong result:                                    0 pts
 *
 * GOALKEEPER (per match):
 *   - Clean sheet (0 goals):   +3 pts
 *   - 1 goal conceded:          0 pts
 *   - 2 goals conceded:        -1 pt
 *   - 3 goals conceded:        -2 pts
 *   - 4+ goals conceded:       -3 pts
 *   - Not played/subbed <75' without injury: -2 pts
 *   - Not played with injury:   0 pts
 *   - Injury <75':              0 pts
 *   - Injury ≥75':             apply general scoring
 *   - Red card:                -2 pts
 *   - Penalty goals NOT counted; overtime goals YES
 *
 * KILLER:
 *   - Killer mundial goal (no penalty, yes ET): +2 pts
 *   - Killer selección goal (no penalty, yes ET): +1 pt
 */

import type {
  Fixture,
  FixtureStatus,
  GoalkeeperMatchEvent,
  KillerGoals,
  MatchPrediction,
  Participant,
  MatchPredictionScore,
  GoalkeeperMatchScore,
  KillerScore,
  ParticipantScoreBreakdown,
  MatchResult,
  StandingEntry,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const POINTS = {
  EXACT_SCORE: 3,
  CORRECT_RESULT_AND_DIFF: 2,  // correct 1X2 + correct goal difference
  CORRECT_RESULT: 1,           // correct 1X2 only
  WRONG_RESULT: 0,

  GOALKEEPER_CLEAN_SHEET: 3,   // 0 goles encajados
  GOALKEEPER_ONE_GOAL: 0,      // 1 gol encajado
  GOALKEEPER_TWO_GOALS: -1,    // 2 goles encajados
  GOALKEEPER_THREE_GOALS: -2,  // 3 goles encajados
  GOALKEEPER_FOUR_PLUS: -3,    // 4+ goles encajados

  GOALKEEPER_NO_PLAY_NO_INJURY: -2,   // not played / subbed before 75' without injury
  GOALKEEPER_NO_PLAY_INJURED: 0,      // not played / subbed before 75' with injury
  GOALKEEPER_RED_CARD: -2,            // red card (on top of goals-conceded score)
  GOALKEEPER_INJURY_BEFORE_75: 0,     // injury before min 75 → flat 0
  // injury after min 75 → use goalkeeperGoalsConcededScore()

  KILLER_MUNDIAL_PER_GOAL: 2,     // top scorer of the tournament
  KILLER_SELECCION_PER_GOAL: 1,   // top scorer of their national team
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getMatchResult(home: number, away: number): MatchResult {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function isFinished(status: FixtureStatus): boolean {
  return ["FT", "AET", "PEN"].includes(status);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Match prediction scoring
// ─────────────────────────────────────────────────────────────────────────────

export function scoreMatchPrediction(
  prediction: MatchPrediction,
  fixture: Fixture
): MatchPredictionScore {
  if (
    fixture.homeScore === null ||
    fixture.awayScore === null ||
    !isFinished(fixture.status)
  ) {
    return {
      fixtureId: fixture.id,
      prediction: { home: prediction.homeGoals, away: prediction.awayGoals },
      actual: { home: fixture.homeScore ?? 0, away: fixture.awayScore ?? 0 },
      points: 0,
      outcome: "miss",
    };
  }

  const actualHome = fixture.homeScore;
  const actualAway = fixture.awayScore;

  const isExact =
    prediction.homeGoals === actualHome && prediction.awayGoals === actualAway;

  const correctSign =
    getMatchResult(prediction.homeGoals, prediction.awayGoals) ===
    getMatchResult(actualHome, actualAway);

  const correctGoalDiff =
    (prediction.homeGoals - prediction.awayGoals) === (actualHome - actualAway);

  const isCorrectResultAndDiff = !isExact && correctSign && correctGoalDiff;
  const isCorrectResult = !isExact && !isCorrectResultAndDiff && correctSign;

  const points = isExact
    ? POINTS.EXACT_SCORE
    : isCorrectResultAndDiff
    ? POINTS.CORRECT_RESULT_AND_DIFF
    : isCorrectResult
    ? POINTS.CORRECT_RESULT
    : POINTS.WRONG_RESULT;

  const outcome = isExact
    ? "exact" as const
    : isCorrectResultAndDiff
    ? "correct_result_and_diff" as const
    : isCorrectResult
    ? "correct_result" as const
    : "miss" as const;

  return {
    fixtureId: fixture.id,
    prediction: { home: prediction.homeGoals, away: prediction.awayGoals },
    actual: { home: actualHome, away: actualAway },
    points,
    outcome,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Goalkeeper scoring per match
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns points for a goalkeeper based on goals conceded (no penalties counted).
 * Used when the GK played the full match, or was injured/substituted after min 75.
 */
export function goalkeeperGoalsConcededScore(goalsAgainst: number): number {
  if (goalsAgainst === 0) return POINTS.GOALKEEPER_CLEAN_SHEET;
  if (goalsAgainst === 1) return POINTS.GOALKEEPER_ONE_GOAL;
  if (goalsAgainst === 2) return POINTS.GOALKEEPER_TWO_GOALS;
  if (goalsAgainst === 3) return POINTS.GOALKEEPER_THREE_GOALS;
  return POINTS.GOALKEEPER_FOUR_PLUS; // 4+
}

/**
 * Full goalkeeper scoring logic for a single match.
 *
 * Notes:
 * - Penalty shootout goals do NOT count.
 * - Overtime (extra time) goals DO count.
 * - The goalkeeper must start AND finish the match (incl. overtime) to get full scoring.
 *   Exceptions: injury or red card apply their own modifiers.
 */
export function scoreGoalkeeperMatch(
  fixture: Fixture,
  event: GoalkeeperMatchEvent,
  goalsAgainst: number  // goals in regular time + ET only (no penalties)
): GoalkeeperMatchScore {
  const base: Omit<GoalkeeperMatchScore, "points" | "reason"> = {
    fixtureId: fixture.id,
    goalkeeperName: "",  // filled by caller
    event,
    goalsAgainst,
  };

  switch (event.type) {
    case "not_played": {
      if (event.injury) {
        return { ...base, points: POINTS.GOALKEEPER_NO_PLAY_INJURED, reason: "No jugó (lesión justificada)" };
      }
      return { ...base, points: POINTS.GOALKEEPER_NO_PLAY_NO_INJURY, reason: "No jugó sin lesión justificada (-2)" };
    }

    case "red_card": {
      // Red card means -2, regardless of goals conceded up to that point
      return { ...base, points: POINTS.GOALKEEPER_RED_CARD, reason: `Expulsado (min ${event.minute}) (-2)` };
    }

    case "substituted": {
      if (event.minute < 75) {
        if (event.injury) {
          // Injury before min 75 → 0 points
          return { ...base, points: POINTS.GOALKEEPER_INJURY_BEFORE_75, reason: `Sustituido por lesión antes del min 75 (min ${event.minute}) → 0` };
        }
        // Substituted before min 75 without injury → -2
        return { ...base, points: POINTS.GOALKEEPER_NO_PLAY_NO_INJURY, reason: `Sustituido sin lesión antes del min 75 (min ${event.minute}) → -2` };
      }
      // Substituted at or after min 75 (with or without injury) → apply general scoring
      const pts = goalkeeperGoalsConcededScore(goalsAgainst);
      return {
        ...base,
        points: pts,
        reason: `Sustituido después del min 75 → puntuación general (${goalsAgainst} goles encajados → ${pts} pts)`,
      };
    }

    case "played_full": {
      const pts = goalkeeperGoalsConcededScore(goalsAgainst);
      return {
        ...base,
        points: pts,
        reason: goalsAgainst === 0
          ? "Portería a 0 (+3)"
          : `${goalsAgainst} gol(es) encajado(s) → ${pts} pts`,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Killer scoring
// ─────────────────────────────────────────────────────────────────────────────

export function scoreKiller(killerGoals: KillerGoals): {
  mundial: KillerScore;
  seleccion: KillerScore;
} {
  return {
    mundial: {
      killerName: "",
      killerType: "mundial",
      goals: killerGoals.mundialGoals,
      pointsPerGoal: POINTS.KILLER_MUNDIAL_PER_GOAL,
      totalPoints: killerGoals.mundialGoals * POINTS.KILLER_MUNDIAL_PER_GOAL,
    },
    seleccion: {
      killerName: "",
      killerType: "seleccion",
      goals: killerGoals.seleccionGoals,
      pointsPerGoal: POINTS.KILLER_SELECCION_PER_GOAL,
      totalPoints: killerGoals.seleccionGoals * POINTS.KILLER_SELECCION_PER_GOAL,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Full participant score calculation
// ─────────────────────────────────────────────────────────────────────────────

export interface FixtureGoalkeeperData {
  fixtureId: string;
  /** Goals conceded in regular time + extra time (no penalties) */
  goalsAgainst: number;
  event: GoalkeeperMatchEvent;
  phase: Fixture["phase"];
}

export interface ScoringInput {
  participant: Participant;
  fixtures: Fixture[];
  /** All goalkeeper events for THIS participant's chosen goalkeeper, per fixture */
  goalkeeperData: FixtureGoalkeeperData[];
  /** Goals by their killers (accumulated across all finished matches) */
  killerGoals: KillerGoals;
}

export function calculateParticipantScore(input: ScoringInput): ParticipantScoreBreakdown {
  const { participant, fixtures, goalkeeperData, killerGoals } = input;
  const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));

  // Match predictions
  const matchPredictions: MatchPredictionScore[] = [];
  let groupStageTotal = 0;

  for (const fixtureId of Object.keys(participant.predictions)) {
    const fixture = fixtureMap.get(fixtureId);
    if (!fixture || !isFinished(fixture.status)) continue;

    const score = scoreMatchPrediction(participant.predictions[fixtureId], fixture);
    matchPredictions.push(score);
    if (fixture.phase === "groups") {
      groupStageTotal += score.points;
    }
  }

  // Goalkeeper
  const goalkeeperMatches: GoalkeeperMatchScore[] = [];
  for (const gkData of goalkeeperData) {
    const fixture = fixtureMap.get(gkData.fixtureId);
    if (!fixture || !isFinished(fixture.status)) continue;

    const score = scoreGoalkeeperMatch(fixture, gkData.event, gkData.goalsAgainst);
    const scored: GoalkeeperMatchScore = {
      ...score,
      goalkeeperName: participant.goalkeeper,
    };
    goalkeeperMatches.push(scored);
    if (gkData.phase === "groups") {
      groupStageTotal += score.points;
    }
  }

  // Killers
  const killerScores = scoreKiller(killerGoals);
  killerScores.mundial.killerName = participant.killerMundial;
  killerScores.seleccion.killerName = participant.killerSeleccion;
  // Killers count across the whole tournament, not just group stage

  const totalFromPredictions = matchPredictions.reduce((s, p) => s + p.points, 0);
  const totalFromGoalkeeper = goalkeeperMatches.reduce((s, g) => s + g.points, 0);
  const totalFromKillers =
    killerScores.mundial.totalPoints + killerScores.seleccion.totalPoints;

  return {
    participantId: participant.id,
    participantName: participant.name,
    matchPredictions,
    goalkeeperMatches,
    killerMundial: killerScores.mundial,
    killerSeleccion: killerScores.seleccion,
    totalFromPredictions,
    totalFromGoalkeeper,
    totalFromKillers,
    grandTotal: totalFromPredictions + totalFromGoalkeeper + totalFromKillers,
    groupStageTotal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Leaderboard builder
// ─────────────────────────────────────────────────────────────────────────────

export function buildLeaderboard(
  breakdowns: ParticipantScoreBreakdown[],
  fixtures: Fixture[]
): StandingEntry[] {
  const finishedFixtures = fixtures
    .filter((f) => isFinished(f.status))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sorted = [...breakdowns].sort((a, b) => {
    // Primary: grand total
    if (b.grandTotal !== a.grandTotal) return b.grandTotal - a.grandTotal;
    // Tiebreaker 1: exact scores
    const aExact = a.matchPredictions.filter((p) => p.outcome === "exact").length;
    const bExact = b.matchPredictions.filter((p) => p.outcome === "exact").length;
    if (bExact !== aExact) return bExact - aExact;
    // Tiebreaker 2: correct results
    const aCorrect = a.matchPredictions.filter((p) => p.outcome === "correct_result").length;
    const bCorrect = b.matchPredictions.filter((p) => p.outcome === "correct_result").length;
    return bCorrect - aCorrect;
  });

  // Assign ranks (shared rank on ties)
  return sorted.map((breakdown, idx) => {
    const prevRank = idx > 0 && sorted[idx - 1].grandTotal === breakdown.grandTotal
      ? sorted.findIndex((s) => s.grandTotal === breakdown.grandTotal) + 1
      : idx + 1;

    // Last 5 finished matches for this participant
    const last5 = finishedFixtures
      .slice(-5)
      .map((f) => {
        const pred = breakdown.matchPredictions.find((p) => p.fixtureId === f.id);
        if (!pred) return "miss" as const;
        if (pred.outcome === "exact") return "hit" as const;
        if (pred.outcome === "correct_result_and_diff" || pred.outcome === "correct_result") return "partial" as const;
        return "miss" as const;
      });

    return {
      rank: prevRank,
      participantId: breakdown.participantId,
      participantName: breakdown.participantName,
      points: breakdown.grandTotal,
      groupStagePoints: breakdown.groupStageTotal,
      exactScores: breakdown.matchPredictions.filter((p) => p.outcome === "exact").length,
      correctResults: breakdown.matchPredictions.filter((p) => p.outcome === "correct_result").length,
      lastFive: last5,
      winProbability: 0, // calculated separately via ELO/simulation
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Live simulation: "What if X wins this match?"
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveSimulationScenario {
  homeScore: number;
  awayScore: number;
  description: string;
}

export interface LiveSimulationResult {
  scenario: LiveSimulationScenario;
  standings: Array<{
    participantId: string;
    participantName: string;
    currentPoints: number;
    projectedPoints: number;
    pointsDelta: number;
    projectedRank: number;
  }>;
}

export function simulateLiveScenario(
  scenario: LiveSimulationScenario,
  fixtureId: string,
  currentBreakdowns: ParticipantScoreBreakdown[],
  participants: Participant[]
): LiveSimulationResult {
  const simulatedFixture: Fixture = {
    id: fixtureId,
    homeTeam: "",
    awayTeam: "",
    homeFlag: "",
    awayFlag: "",
    date: new Date().toISOString(),
    status: "FT",
    homeScore: scenario.homeScore,
    awayScore: scenario.awayScore,
    homePenalties: null,
    awayPenalties: null,
    minute: 90,
    phase: "groups",
  };

  const projected = participants.map((p) => {
    const current = currentBreakdowns.find((b) => b.participantId === p.id);
    const currentPoints = current?.grandTotal ?? 0;
    const prediction = p.predictions[fixtureId];
    if (!prediction) {
      return { participantId: p.id, participantName: p.name, currentPoints, projectedPoints: currentPoints, pointsDelta: 0, projectedRank: 0 };
    }
    const predScore = scoreMatchPrediction(prediction, simulatedFixture);
    return {
      participantId: p.id,
      participantName: p.name,
      currentPoints,
      projectedPoints: currentPoints + predScore.points,
      pointsDelta: predScore.points,
      projectedRank: 0,
    };
  });

  // Assign projected ranks
  projected.sort((a, b) => b.projectedPoints - a.projectedPoints);
  projected.forEach((p, i) => { p.projectedRank = i + 1; });

  return { scenario, standings: projected };
}
