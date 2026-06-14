/**
 * Score store — module-level.
 *
 * Two layers, both applied by applyOverrides():
 *   1. _syncedScores — written by the cron job from FDO live data.
 *   2. _overrides    — written by admin panel. Takes precedence over synced scores.
 *
 * Lifecycle: lives in the Node.js process. Resets on cold starts.
 * For production persistence, migrate to Vercel KV.
 */

export interface ScoreOverride {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  updatedAt: string;
}

/** Admin manual overrides — highest priority */
const _overrides = new Map<string, ScoreOverride>();

/** Scores synced from FDO cron — lower priority than admin overrides */
const _syncedScores = new Map<string, ScoreOverride>();

// ─── Admin overrides ─────────────────────────────────────────────────────────

export function getOverride(fixtureId: string): ScoreOverride | undefined {
  return _overrides.get(fixtureId);
}

export function setOverride(override: ScoreOverride): void {
  _overrides.set(override.fixtureId, override);
}

export function deleteOverride(fixtureId: string): boolean {
  return _overrides.delete(fixtureId);
}

export function getAllOverrides(): ScoreOverride[] {
  return Array.from(_overrides.values());
}

// ─── FDO synced scores ────────────────────────────────────────────────────────

export function setSyncedScore(score: ScoreOverride): void {
  _syncedScores.set(score.fixtureId, score);
}

export function setSyncedScoresBulk(scores: ScoreOverride[]): void {
  for (const s of scores) _syncedScores.set(s.fixtureId, s);
}

export function getAllSyncedScores(): ScoreOverride[] {
  return Array.from(_syncedScores.values());
}

// ─── Combined apply ───────────────────────────────────────────────────────────

/**
 * Apply scores to a list of match-like objects.
 * Priority: admin override > FDO sync > original static value.
 */
export function applyOverrides<T extends { id: string; homeScore: number | null; awayScore: number | null }>(
  matches: T[]
): T[] {
  return matches.map((m) => {
    const ov = _overrides.get(m.id) ?? _syncedScores.get(m.id);
    if (!ov) return m;
    return { ...m, homeScore: ov.homeScore, awayScore: ov.awayScore };
  });
}
