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
