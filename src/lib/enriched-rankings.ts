/**
 * Computes real tournament rankings using only 2 FDO API calls:
 *  - killerMundial: top scorers from getWCTopScorers()
 *  - killerSeleccion: Spanish players from getWCTopScorers(100) filtered by team
 *  - topGoalkeepers: ALL WC 2026 GKs, scored from match-list results after each game
 *    (no detail API calls — free tier doesn't return lineups/goals in detail endpoint)
 *
 * All fetch() calls use next.revalidate — shared across Vercel Lambda instances
 * via Vercel Data Cache (no in-process Maps).
 */

import {
  getAllFinishedWCMatches,
  getWCTopScorers,
  normStr,
} from "./football-data-org";
import { goalkeeperGoalsConcededScore } from "./scoring-engine";
import type { KillerRankEntry, GkRankEntry, EnrichedRankings } from "./types";
export type { KillerRankEntry, GkRankEntry, EnrichedRankings };

/**
 * WC 2026 starting goalkeepers. Keys are normStr() of the FDO English team name.
 * Uses exact key matching (no substring), so "austria" and "australia" never collide.
 * Multiple keys per team handle alternate FDO spellings (e.g. both "korea republic"
 * and "south korea" map to the same GK).
 */
const TEAM_GK_MAP: Record<string, string> = {
  // Group A — Mexico, South Africa, Korea Republic, Czech Republic
  "mexico":                       "Luis Malagón",
  "south africa":                 "Ronwen Williams",
  "korea republic":               "Kim Seung-gyu",
  "south korea":                  "Kim Seung-gyu",
  "czech republic":               "Jiří Staněk",
  "czechia":                      "Jiří Staněk",

  // Group B — Canada, Bosnia, Qatar, Switzerland
  "canada":                       "Maxime Crépeau",
  "bosnia and herzegovina":       "Kenan Pirić",
  "bosnia & herzegovina":         "Kenan Pirić",
  "bosnia-herzegovina":           "Kenan Pirić",
  "qatar":                        "Meshaal Barsham",
  "switzerland":                  "Yann Sommer",

  // Group C — Brazil, Morocco, Haiti, Scotland
  "brazil":                       "Alisson Becker",
  "morocco":                      "Yassine Bounou",
  "haiti":                        "Josue Duverger",
  "scotland":                     "Angus Gunn",

  // Group D — United States, Paraguay, Australia, Turkey
  "united states":                "Matt Turner",
  "paraguay":                     "Gastón Ruíz",
  "australia":                    "Mathew Ryan",
  "turkey":                       "Altay Bayındır",

  // Group E — Germany, Curaçao, Ivory Coast, Ecuador
  "germany":                      "Manuel Neuer",
  "curacao":                      "Eloy Room",        // normStr("Curaçao")
  "ivory coast":                  "Yahia Fofana",
  "cote d'ivoire":                "Yahia Fofana",     // normStr("Côte d'Ivoire")
  "ecuador":                      "Hernán Galíndez",

  // Group F — Netherlands, Japan, Sweden, Tunisia
  "netherlands":                  "Bart Verbruggen",
  "japan":                        "Zion Suzuki",
  "sweden":                       "Robin Olsen",
  "tunisia":                      "Béchir Ben Said",

  // Group G — Belgium, Egypt, Iran, New Zealand
  "belgium":                      "Koen Casteels",
  "egypt":                        "Mohammed Abu Gabal",
  "iran":                         "Alireza Beiranvand",
  "new zealand":                  "Max Crocombe",

  // Group H — Spain, Saudi Arabia, Uruguay, Cape Verde
  "spain":                        "Unai Simón",
  "saudi arabia":                 "Mohammed Al-Owais",
  "uruguay":                      "Sergio Rochet",
  "cape verde":                   "Vozinha",
  "cabo verde":                   "Vozinha",

  // Group I — France, Senegal, Iraq, Norway
  "france":                       "Mike Maignan",
  "senegal":                      "Édouard Mendy",
  "iraq":                         "Jalal Hassan",
  "norway":                       "Ørjan Nyland",

  // Group J — Argentina, Algeria, Austria, Jordan
  "argentina":                    "Emiliano Martínez",
  "algeria":                      "Raïs M'Bolhi",
  "austria":                      "Patrick Pentz",
  "jordan":                       "Amer Shafi",

  // Group K — Portugal, DR Congo, Uzbekistan, Colombia
  "portugal":                     "Diogo Costa",
  "congo dr":                     "Joël Kiassumbua",
  "dr congo":                     "Joël Kiassumbua",
  "democratic republic of congo": "Joël Kiassumbua",
  "uzbekistan":                   "Eldorbek Suyunov",
  "colombia":                     "Camilo Vargas",

  // Group L — England, Croatia, Ghana, Panama
  "england":                      "Jordan Pickford",
  "croatia":                      "Dominik Livaković",
  "ghana":                        "Lawrence Ati-Zigi",
  "panama":                       "Luis Mejía",
};

/** Return GK name for an FDO English team name, or null if not in the map */
function lookupTeamGK(fdoTeamName: string): string | null {
  return TEAM_GK_MAP[normStr(fdoTeamName)] ?? null;
}

/** Spanish forwards shown when Spain hasn't scored yet */
const SPAIN_FALLBACK_FORWARDS = [
  "Borja Iglesias",
  "Mikel Oyarzabal",
  "Lamine Yamal",
  "Nico Williams",
  "Ferran Torres",
];

export async function getEnrichedRankings(): Promise<EnrichedRankings> {
  const empty: EnrichedRankings = { killerMundial: [], killerSeleccion: [], topGoalkeepers: [] };

  try {
    // 2 API calls in parallel — well within 10 req/min free tier
    const [topScorers, finishedMatches] = await Promise.all([
      getWCTopScorers(100),
      getAllFinishedWCMatches(),
    ]);

    // ── Killer mundial ───────────────────────────────────────────────────────
    const killerMundial: KillerRankEntry[] = topScorers
      .slice(0, 5)
      .map((s) => ({ name: s.player.name, goals: s.goals }));

    // ── Killer selección ─────────────────────────────────────────────────────
    // Filter scorers whose team is Spain (FDO returns "Spain" in English)
    const spainScorers = topScorers.filter((s) => {
      const n = normStr(s.team.name);
      return n === "spain" || n.includes("spain");
    });

    const killerSeleccion: KillerRankEntry[] = spainScorers.length > 0
      ? spainScorers
          .map((s) => ({ name: s.player.name, goals: s.goals }))
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 5)
      : SPAIN_FALLBACK_FORWARDS.map((name) => ({ name, goals: 0 }));

    // ── GK retrospective — ALL WC GKs scored from match-list results ────────
    // For each finished match: look up GK for each team, calculate pts from
    // goals conceded (score.fullTime is available on the match list endpoint).
    const gkTotals = new Map<string, number>();
    for (const match of finishedMatches) {
      const hs = match.score.fullTime.home ?? 0;
      const as_ = match.score.fullTime.away ?? 0;

      const homeGK = lookupTeamGK(match.homeTeam.name);
      const awayGK = lookupTeamGK(match.awayTeam.name);

      // Home GK conceded the away team's goals
      if (homeGK) {
        const pts = goalkeeperGoalsConcededScore(as_);
        gkTotals.set(homeGK, (gkTotals.get(homeGK) ?? 0) + pts);
      }
      // Away GK conceded the home team's goals
      if (awayGK) {
        const pts = goalkeeperGoalsConcededScore(hs);
        gkTotals.set(awayGK, (gkTotals.get(awayGK) ?? 0) + pts);
      }
    }

    const topGoalkeepers: GkRankEntry[] = [...gkTotals.entries()]
      .map(([name, pts]) => ({ name, pts }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
      .slice(0, 5);

    return { killerMundial, killerSeleccion, topGoalkeepers };
  } catch {
    return empty;
  }
}
