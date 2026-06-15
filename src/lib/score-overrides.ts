/**
 * Score store — admin manual overrides only.
 *
 * Lives in the Node.js process. Admin overrides are low-frequency (set once per match)
 * so single-Lambda writes are acceptable.
 *
 * FDO live scores are no longer cached here — Next.js fetch cache (revalidate: 60s)
 * handles sharing across Lambda instances without extra infrastructure.
 */

export interface ScoreOverride {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  updatedAt: string;
}

/** Admin manual overrides — highest priority */
const _overrides = new Map<string, ScoreOverride>();

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

/**
 * Apply admin overrides to a list of match-like objects.
 * FDO scores come through the fetch cache (live-scores.ts), not through this store.
 */
export function applyOverrides<T extends { id: string; homeScore: number | null; awayScore: number | null }>(
  matches: T[]
): T[] {
  return matches.map((m) => {
    const ov = _overrides.get(m.id);
    if (!ov) return m;
    return { ...m, homeScore: ov.homeScore, awayScore: ov.awayScore };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Killer & GK overrides
// ─────────────────────────────────────────────────────────────────────────────

export interface KillerOverride {
  /** Player name as stored in participants.ts, e.g. "Gyökeres (SUE)" */
  playerName: string;
  mundialGoals: number;
  updatedAt: string;
}

export interface GkOverride {
  /** GK name as stored in participants.ts, e.g. "Pickford (ING)" */
  gkName: string;
  /** Total points for the whole tournament so far */
  points: number;
  updatedAt: string;
}

const _killerOverrides = new Map<string, KillerOverride>();
const _gkOverrides = new Map<string, GkOverride>();

// ── Killer overrides ─────────────────────────────────────────────────────────

export function setKillerOverride(o: KillerOverride): void {
  _killerOverrides.set(o.playerName, o);
}

export function deleteKillerOverride(playerName: string): boolean {
  return _killerOverrides.delete(playerName);
}

export function getAllKillerOverrides(): KillerOverride[] {
  return Array.from(_killerOverrides.values());
}

/**
 * Returns the override goal count for a player, or null if no override is set.
 * The caller should then skip the FDO lookup.
 */
export function getKillerOverride(playerName: string): number | null {
  const o = _killerOverrides.get(playerName);
  return o != null ? o.mundialGoals : null;
}

// ── GK overrides ─────────────────────────────────────────────────────────────

export function setGkOverride(o: GkOverride): void {
  _gkOverrides.set(o.gkName, o);
}

export function deleteGkOverride(gkName: string): boolean {
  return _gkOverrides.delete(gkName);
}

export function getAllGkOverrides(): GkOverride[] {
  return Array.from(_gkOverrides.values());
}

/**
 * Returns the override total points for a GK, or null if no override is set.
 * A non-null value means the cron/scoring should use it directly instead of
 * computing from match events.
 */
export function getGkOverride(gkName: string): number | null {
  const o = _gkOverrides.get(gkName);
  return o != null ? o.points : null;
}
