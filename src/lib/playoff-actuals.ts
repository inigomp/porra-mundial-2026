/**
 * Playoff actuals — derives who qualified to each bracket slot from FDO API data.
 *
 * No manual admin input required.
 * Algorithm:
 *   1. Group stage slots ("1º grupo A", "2º grupo A") → from FDO standings.
 *   2. Knockout slots (OCTAVOFINALISTA N, CUARTOFINALISTA N, etc.) → cascade:
 *      for each finished knockout FDO match, find which bracket entry matches
 *      the two teams (via already-resolved actuals), then set the winner slot.
 *   3. 3rd-place qualifier slots ("3º grupo A/B/C/D/F") → inferred from
 *      R32 matches where one team is unknown (not yet in any 1st/2nd slot).
 *
 * Admin overrides (from score-overrides.ts) take priority over auto-derived values.
 */

import type { FdoMatchSummary, FdoStandingGroup } from "./football-data-org";
import { normStr } from "./football-data-org";
import type { PlayoffActuals } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// FDO English team name → uppercase Spanish porra name
// ─────────────────────────────────────────────────────────────────────────────

const FDO_TO_SPANISH_MAP: Record<string, string> = {
  // Group A
  "mexico":                           "MÉXICO",
  "south africa":                     "SUDÁFRICA",
  "korea republic":                   "COREA DEL SUR",
  "south korea":                      "COREA DEL SUR",
  "czech republic":                   "CHEQUIA",
  "czechia":                          "CHEQUIA",
  // Group B
  "canada":                           "CANADÁ",
  "bosnia and herzegovina":           "BOSNIA Y HERZEGOVINA",
  "bosnia-herzegovina":               "BOSNIA Y HERZEGOVINA",
  "bosnia & herzegovina":             "BOSNIA Y HERZEGOVINA",
  "qatar":                            "CATAR",
  "switzerland":                      "SUIZA",
  // Group C
  "brazil":                           "BRASIL",
  "morocco":                          "MARRUECOS",
  "haiti":                            "HAITÍ",
  "scotland":                         "ESCOCIA",
  // Group D
  "united states":                    "ESTADOS UNIDOS",
  "usa":                              "ESTADOS UNIDOS",
  "paraguay":                         "PARAGUAY",
  "australia":                        "AUSTRALIA",
  "turkey":                           "TURQUÍA",
  "turkiye":                          "TURQUÍA",
  // Group E
  "germany":                          "ALEMANIA",
  "curacao":                          "CURAZAO",
  "ivory coast":                      "COSTA DE MARFIL",
  "cote d'ivoire":                    "COSTA DE MARFIL",
  "cote divoire":                     "COSTA DE MARFIL",
  "ecuador":                          "ECUADOR",
  // Group F
  "netherlands":                      "PAÍSES BAJOS",
  "japan":                            "JAPÓN",
  "sweden":                           "SUECIA",
  "tunisia":                          "TÚNEZ",
  // Group G
  "belgium":                          "BÉLGICA",
  "egypt":                            "EGIPTO",
  "iran":                             "IRÁN",
  "new zealand":                      "NUEVA ZELANDA",
  // Group H
  "spain":                            "ESPAÑA",
  "saudi arabia":                     "ARABIA SAUDITA",
  "uruguay":                          "URUGUAY",
  "cape verde":                       "CABO VERDE",
  "cabo verde":                       "CABO VERDE",
  // Group I
  "france":                           "FRANCIA",
  "senegal":                          "SENEGAL",
  "iraq":                             "IRAK",
  "norway":                           "NORUEGA",
  // Group J
  "argentina":                        "ARGENTINA",
  "algeria":                          "ARGELIA",
  "austria":                          "AUSTRIA",
  "jordan":                           "JORDANIA",
  // Group K
  "portugal":                         "PORTUGAL",
  "dr congo":                         "RD CONGO",
  "congo dr":                         "RD CONGO",
  "democratic republic of congo":     "RD CONGO",
  "uzbekistan":                       "UZBEKISTÁN",
  "colombia":                         "COLOMBIA",
  // Group L
  "england":                          "INGLATERRA",
  "croatia":                          "CROACIA",
  "ghana":                            "GHANA",
  "panama":                           "PANAMÁ",
};

function fdoToSpanish(fdoName: string): string | null {
  return FDO_TO_SPANISH_MAP[normStr(fdoName)] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static bracket table
// Each entry: two slot keys → the winner fills winnerSlot.
// Derived from the porra spreadsheet rows 135-200.
// ─────────────────────────────────────────────────────────────────────────────

interface BracketEntry {
  slot1: string;
  slot2: string;
  winnerSlot: string;
}

const BRACKET: BracketEntry[] = [
  // ── DIECISEISAVOS (R32) ───────────────────────────────────────────────────
  { slot1: "2º grupo A",            slot2: "2º grupo B",            winnerSlot: "OCTAVOFINALISTA 1"  },
  { slot1: "1º grupo C",            slot2: "2º grupo F",            winnerSlot: "OCTAVOFINALISTA 2"  },
  { slot1: "1º grupo E",            slot2: "3º grupo A/B/C/D/F",   winnerSlot: "OCTAVOFINALISTA 3"  },
  { slot1: "1º grupo F",            slot2: "2º grupo C",            winnerSlot: "OCTAVOFINALISTA 4"  },
  { slot1: "2º grupo E",            slot2: "2º grupo I",            winnerSlot: "OCTAVOFINALISTA 5"  },
  { slot1: "1º grupo I",            slot2: "3º grupo C/D/F/G/H",   winnerSlot: "OCTAVOFINALISTA 6"  },
  { slot1: "1º grupo A",            slot2: "3º grupo C/E/F/H/I",   winnerSlot: "OCTAVOFINALISTA 7"  },
  { slot1: "1º grupo L",            slot2: "3º grupo E/H/I/J/K",   winnerSlot: "OCTAVOFINALISTA 8"  },
  { slot1: "1º grupo G",            slot2: "3º grupo A/E/H/I/J",   winnerSlot: "OCTAVOFINALISTA 9"  },
  { slot1: "2º grupo K",            slot2: "2º grupo L",            winnerSlot: "OCTAVOFINALISTA 10" },
  { slot1: "1º grupo D",            slot2: "3º grupo B/E/F/I/J",   winnerSlot: "OCTAVOFINALISTA 11" },
  { slot1: "1º grupo B",            slot2: "3º grupo E/F/G/I/J",   winnerSlot: "OCTAVOFINALISTA 12" },
  { slot1: "1º grupo H",            slot2: "2º grupo J",            winnerSlot: "OCTAVOFINALISTA 13" },
  { slot1: "1º grupo J",            slot2: "2º grupo H",            winnerSlot: "OCTAVOFINALISTA 14" },
  { slot1: "1º grupo K",            slot2: "3º grupo D/E/I/J/L",   winnerSlot: "OCTAVOFINALISTA 15" },
  { slot1: "2º grupo D",            slot2: "2º grupo G",            winnerSlot: "OCTAVOFINALISTA 16" },
  // ── OCTAVOS (R16) ─────────────────────────────────────────────────────────
  { slot1: "OCTAVOFINALISTA 1",     slot2: "OCTAVOFINALISTA 4",     winnerSlot: "CUARTOFINALISTA 1"  },
  { slot1: "OCTAVOFINALISTA 3",     slot2: "OCTAVOFINALISTA 6",     winnerSlot: "CUARTOFINALISTA 2"  },
  { slot1: "OCTAVOFINALISTA 2",     slot2: "OCTAVOFINALISTA 5",     winnerSlot: "CUARTOFINALISTA 3"  },
  { slot1: "OCTAVOFINALISTA 7",     slot2: "OCTAVOFINALISTA 8",     winnerSlot: "CUARTOFINALISTA 4"  },
  { slot1: "OCTAVOFINALISTA 10",    slot2: "OCTAVOFINALISTA 13",    winnerSlot: "CUARTOFINALISTA 5"  },
  { slot1: "OCTAVOFINALISTA 9",     slot2: "OCTAVOFINALISTA 11",    winnerSlot: "CUARTOFINALISTA 6"  },
  { slot1: "OCTAVOFINALISTA 14",    slot2: "OCTAVOFINALISTA 16",    winnerSlot: "CUARTOFINALISTA 7"  },
  { slot1: "OCTAVOFINALISTA 12",    slot2: "OCTAVOFINALISTA 15",    winnerSlot: "CUARTOFINALISTA 8"  },
  // ── CUARTOS ───────────────────────────────────────────────────────────────
  { slot1: "CUARTOFINALISTA 2",     slot2: "CUARTOFINALISTA 1",     winnerSlot: "SEMIFINALISTA 1"    },
  { slot1: "CUARTOFINALISTA 5",     slot2: "CUARTOFINALISTA 6",     winnerSlot: "SEMIFINALISTA 2"    },
  { slot1: "CUARTOFINALISTA 4",     slot2: "CUARTOFINALISTA 3",     winnerSlot: "SEMIFINALISTA 3"    },
  { slot1: "CUARTOFINALISTA 7",     slot2: "CUARTOFINALISTA 8",     winnerSlot: "SEMIFINALISTA 4"    },
  // ── SEMIS → FINALISTAS ────────────────────────────────────────────────────
  { slot1: "SEMIFINALISTA 1",       slot2: "SEMIFINALISTA 2",       winnerSlot: "FINALISTA 1"        },
  { slot1: "SEMIFINALISTA 3",       slot2: "SEMIFINALISTA 4",       winnerSlot: "FINALISTA 2"        },
  // ── FINAL → CAMPEÓN ──────────────────────────────────────────────────────
  { slot1: "FINALISTA 1",           slot2: "FINALISTA 2",           winnerSlot: "CAMPEÖN"            },
];

// ─────────────────────────────────────────────────────────────────────────────
// Core builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives playoff actuals from FDO API data.
 *
 * @param standings   - from getWCStandings() (empty array if not available)
 * @param allFinished - from getAllFinishedWCMatches()
 * @param overrides   - admin manual overrides (from getPlayoffActuals()) — take priority
 */
export function buildPlayoffActuals(
  standings: FdoStandingGroup[],
  allFinished: FdoMatchSummary[],
  overrides: PlayoffActuals = {},
): PlayoffActuals {
  const actuals: PlayoffActuals = {};

  // ── 1. Group stage positions from standings ───────────────────────────────
  for (const group of standings) {
    if (group.stage !== "GROUP_STAGE") continue;
    // group.group = "GROUP_A" | "GROUP_B" | ... | "GROUP_L"
    const letter = group.group.replace("GROUP_", "");
    for (const entry of group.table) {
      if (entry.position > 3) continue;
      const spanish = fdoToSpanish(entry.team.name);
      if (!spanish) continue;
      if (entry.position === 1) actuals[`1º grupo ${letter}`] = spanish;
      if (entry.position === 2) actuals[`2º grupo ${letter}`] = spanish;
      // Position 3 is stored too, used for the qualified-teams set later.
      // We won't assign it to a bracket slot yet — that's inferred from match data.
    }
  }

  // Build a quick lookup: Spanish team name → "1º/2º grupo X" slot key
  const teamToGroupSlot = new Map<string, string>();
  for (const [slot, team] of Object.entries(actuals)) {
    if (/^[12]º grupo /.test(slot)) teamToGroupSlot.set(team, slot);
  }

  // ── 2. Knockout bracket cascade ───────────────────────────────────────────
  // Filter: any match that isn't group stage and has a definitive winner
  const knockoutFinished = allFinished.filter(
    (m) =>
      m.stage !== "GROUP_STAGE" &&
      m.score.winner !== null &&
      m.score.winner !== "DRAW"
  );

  // Sort by date (ascending) so earlier rounds are processed first
  knockoutFinished.sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  for (const match of knockoutFinished) {
    const homeSpanish = fdoToSpanish(match.homeTeam.name);
    const awaySpanish = fdoToSpanish(match.awayTeam.name);
    if (!homeSpanish || !awaySpanish) continue;

    const winner = match.score.winner === "HOME_TEAM" ? homeSpanish : awaySpanish;

    // Special case: THIRD_PLACE → set "TERCER PUESTO"
    if (match.stage === "THIRD_PLACE") {
      actuals["TERCER PUESTO"] = winner;
      continue;
    }

    // Special case: FINAL → set both finalists + "CAMPEÖN"
    if (match.stage === "FINAL") {
      actuals["FINALISTA 1"] = homeSpanish;
      actuals["FINALISTA 2"] = awaySpanish;
      actuals["CAMPEÖN"] = winner;
      continue;
    }

    // General case: find which bracket entry matches these two teams
    let matched = false;
    for (const entry of BRACKET) {
      const team1 = actuals[entry.slot1];
      const team2 = actuals[entry.slot2];

      // Both slots already resolved → just match by teams
      if (team1 && team2) {
        if (
          (team1 === homeSpanish && team2 === awaySpanish) ||
          (team1 === awaySpanish && team2 === homeSpanish)
        ) {
          actuals[entry.winnerSlot] = winner;
          matched = true;
          break;
        }
        continue;
      }

      // slot1 known, slot2 is unresolved (3rd-place group slot)
      if (team1 && !team2 && (team1 === homeSpanish || team1 === awaySpanish)) {
        const thirdPlaceTeam = team1 === homeSpanish ? awaySpanish : homeSpanish;
        actuals[entry.slot2] = thirdPlaceTeam;
        actuals[entry.winnerSlot] = winner;
        matched = true;
        break;
      }

      // slot2 known, slot1 is unresolved (3rd-place group slot)
      if (!team1 && team2 && (team2 === homeSpanish || team2 === awaySpanish)) {
        const thirdPlaceTeam = team2 === homeSpanish ? awaySpanish : homeSpanish;
        actuals[entry.slot1] = thirdPlaceTeam;
        actuals[entry.winnerSlot] = winner;
        matched = true;
        break;
      }
    }
    // If matched === false after all entries: the FDO match uses a team name not
    // yet in actuals and no partial bracket entry matches. Skip — the slot will
    // remain unresolved until standings data provides the group positions.
  }

  // ── 3. Admin overrides take priority ─────────────────────────────────────
  return { ...actuals, ...overrides };
}
