<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

- `cookies()`, `headers()`, and `params` are **async** — always `await` them.
- `"use client"` only when genuinely needed (event handlers, browser APIs). Default to Server Components.
- Route handlers live under `src/app/api/`. No pages-router patterns.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:caching-rules -->
# Caching — fetch revalidate, never in-process Maps

The app runs on Vercel Hobby (multiple Lambda instances). In-process `Map` or module-level variables are NOT shared across instances.

- **DO**: use `fetch(..., { next: { revalidate: N } })` — Vercel Data Cache is shared across all instances.
- **DO NOT**: introduce new module-level `Map` or singleton caches for external API data.
- `getLiveWCMatches` → `revalidate: 30`. `getRecentWCMatches` / `getTodayWCMatches` / `getMatchDetail` → `revalidate: 60`.
- Exception: `standings-cache.ts` uses a module Map intentionally (written by the daily cron, not per-request). Do not change that pattern without discussion.
<!-- END:caching-rules -->

<!-- BEGIN:score-priority -->
# Score resolution priority (DO NOT invert)

1. Admin overrides (`_overrides` Map in `score-overrides.ts`)
2. FDO live/recent data via `football-data-org.ts` fetch cache
3. Static `MATCHES` array in `participants.ts`

Any change to `live-scores.ts` or `score-overrides.ts` must preserve this order.
<!-- END:score-priority -->

<!-- BEGIN:fdo-client -->
# football-data.org API — single client, normalized names

- All FDO calls go through `src/lib/football-data-org.ts`. No direct `fetch` to `api.football-data.org` anywhere else.
- Player names from FDO include accents and no country codes. Internal names include country codes: `"Mbappé (FRA)"`.
- Use `normStr()` and `playerKey()` from `football-data-org.ts` when comparing player names across sources.
- GK alias table (`GK_ALIASES`) handles registration mismatches (e.g., Bono ↔ Bounou). Add entries there, not inline hacks.
- Free tier: 10 req/min. Do not introduce new endpoints without accounting for rate limits.
<!-- END:fdo-client -->

<!-- BEGIN:domain-types -->
# Domain types — single source of truth

- All domain types live in `src/lib/types.ts`. Do not define `Fixture`, `Participant`, `MatchPrediction`, or scoring types inline elsewhere.
- `Fixture.homeScore` / `awayScore` = regular time + ET goals. NOT penalties. Penalties go in `homePenalties` / `awayPenalties`.
- `FixtureStatus` values: `"NS" | "1H" | "HT" | "2H" | "ET" | "PEN" | "FT" | "AET" | "ABD"`. No ad-hoc strings.
<!-- END:domain-types -->

<!-- BEGIN:security -->
# Security

- Debug endpoints (e.g., `/api/debug/*`) must be protected with `ADMIN_SECRET` header check or removed before shipping.
- Never expose `FOOTBALL_DATA_ORG_TOKEN` or `ADMIN_SECRET` in client components or public responses.
- No `eval`, `dangerouslySetInnerHTML` with unsanitized input, or dynamic `require`.
<!-- END:security -->

<!-- BEGIN:encoding -->
# File encoding

- All source files must be UTF-8. The codebase has accented characters (é, á, ñ, etc.).
- Never use PowerShell `Set-Content` without `-Encoding UTF8`. Prefer `[System.IO.File]::WriteAllText(..., [System.Text.Encoding]::UTF8)`.
<!-- END:encoding -->
