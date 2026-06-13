/**
 * Module-level standings cache.
 *
 * Lives in the Node.js process (dev server or warm Lambda instance).
 * The cron job writes enriched standings here after fetching from football-data.org.
 * The standings route reads from here, falling back to static-only calculation.
 *
 * TTL: 5 minutes — fresh enough for a match in progress.
 */

import type { StandingEntry } from "./types";
import type { FixtureGoalkeeperData } from "./scoring-engine";
import type { KillerGoals } from "./types";

export interface EnrichedStandingsCache {
  standings: StandingEntry[];
  /** Per-participant goalkeeper data from the last FDO sync */
  goalkeeperData: Record<string, FixtureGoalkeeperData[]>;
  /** Per-participant killer goal tallies from the last FDO sync */
  killerGoals: Record<string, KillerGoals>;
  dataSource: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

let _cache: EnrichedStandingsCache | null = null;

export function getStandingsCache(): EnrichedStandingsCache | null {
  if (!_cache) return null;
  if (Date.now() - _cache.cachedAt > CACHE_TTL_MS) {
    _cache = null;
    return null;
  }
  return _cache;
}

export function setStandingsCache(data: Omit<EnrichedStandingsCache, "cachedAt">): void {
  _cache = { ...data, cachedAt: Date.now() };
}

export function clearStandingsCache(): void {
  _cache = null;
}
