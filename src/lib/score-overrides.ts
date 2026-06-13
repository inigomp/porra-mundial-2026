/**
 * Admin score overrides — module-level store.
 *
 * Allows admins to manually enter or correct match scores when the API
 * is unavailable or wrong. Overrides take precedence over static MATCHES data.
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
 * Apply overrides to a list of match-like objects.
 * Returns a new array; originals are not mutated.
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
