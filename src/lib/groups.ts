/**
 * Group stage structure for the Porra Mundial 2026.
 *
 * 12 groups (A–L) derived from the MATCHES data in participants.ts.
 * Each group has 4 teams and 6 round-robin matches.
 */

export const TEAM_FLAGS: Record<string, string> = {
  // Group A
  "México": "🇲🇽",
  "Sudáfrica": "🇿🇦",
  "Corea del Sur": "🇰🇷",
  "Chequia": "🇨🇿",
  // Group B
  "Canadá": "🇨🇦",
  "Bosnia y Herzegovina": "🇧🇦",
  "Catar": "🇶🇦",
  "Suiza": "🇨🇭",
  // Group C
  "Brasil": "🇧🇷",
  "Marruecos": "🇲🇦",
  "Haití": "🇭🇹",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  // Group D
  "Estados Unidos": "🇺🇸",
  "Paraguay": "🇵🇾",
  "Australia": "🇦🇺",
  "Turquía": "🇹🇷",
  // Group E
  "Alemania": "🇩🇪",
  "Curazao": "🇨🇼",
  "Costa de Marfil": "🇨🇮",
  "Ecuador": "🇪🇨",
  // Group F
  "Países Bajos": "🇳🇱",
  "Japón": "🇯🇵",
  "Suecia": "🇸🇪",
  "Túnez": "🇹🇳",
  // Group G
  "Bélgica": "🇧🇪",
  "Egipto": "🇪🇬",
  "Irán": "🇮🇷",
  "Nueva Zelanda": "🇳🇿",
  // Group H
  "España": "🇪🇸",
  "Cabo Verde": "🇨🇻",
  "Arabia Saudita": "🇸🇦",
  "Uruguay": "🇺🇾",
  // Group I
  "Francia": "🇫🇷",
  "Senegal": "🇸🇳",
  "Irak": "🇮🇶",
  "Noruega": "🇳🇴",
  // Group J
  "Argentina": "🇦🇷",
  "Argelia": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordania": "🇯🇴",
  // Group K
  "Portugal": "🇵🇹",
  "RD Congo": "🇨🇩",
  "Uzbekistán": "🇺🇿",
  "Colombia": "🇨🇴",
  // Group L
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croacia": "🇭🇷",
  "Ghana": "🇬🇭",
  "Panamá": "🇵🇦",
};

export interface GroupDefinition {
  name: string;
  matchIds: string[];
  teams: string[];
}

export const GROUPS: GroupDefinition[] = [
  {
    name: "A",
    matchIds: ["m37", "m38", "m39", "m40", "m41", "m42"],
    teams: ["México", "Sudáfrica", "Corea del Sur", "Chequia"],
  },
  {
    name: "B",
    matchIds: ["m45", "m46", "m47", "m48", "m49", "m50"],
    teams: ["Canadá", "Bosnia y Herzegovina", "Catar", "Suiza"],
  },
  {
    name: "C",
    matchIds: ["m53", "m54", "m55", "m56", "m57", "m58"],
    teams: ["Brasil", "Marruecos", "Haití", "Escocia"],
  },
  {
    name: "D",
    matchIds: ["m61", "m62", "m63", "m64", "m65", "m66"],
    teams: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
  },
  {
    name: "E",
    matchIds: ["m69", "m70", "m71", "m72", "m73", "m74"],
    teams: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  },
  {
    name: "F",
    matchIds: ["m77", "m78", "m79", "m80", "m81", "m82"],
    teams: ["Países Bajos", "Japón", "Suecia", "Túnez"],
  },
  {
    name: "G",
    matchIds: ["m85", "m86", "m87", "m88", "m89", "m90"],
    teams: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
  },
  {
    name: "H",
    matchIds: ["m93", "m94", "m95", "m96", "m97", "m98"],
    teams: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
  },
  {
    name: "I",
    matchIds: ["m101", "m102", "m103", "m104", "m105", "m106"],
    teams: ["Francia", "Senegal", "Irak", "Noruega"],
  },
  {
    name: "J",
    matchIds: ["m109", "m110", "m111", "m112", "m113", "m114"],
    teams: ["Argentina", "Argelia", "Austria", "Jordania"],
  },
  {
    name: "K",
    matchIds: ["m117", "m118", "m119", "m120", "m121", "m122"],
    teams: ["Portugal", "RD Congo", "Uzbekistán", "Colombia"],
  },
  {
    name: "L",
    matchIds: ["m125", "m126", "m127", "m128", "m129", "m130"],
    teams: ["Inglaterra", "Croacia", "Ghana", "Panamá"],
  },
];

export interface TeamStanding {
  team: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface GroupMatch {
  id: string;
  homeTeam: string;
  homeFlag: string;
  awayTeam: string;
  awayFlag: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface GroupResult {
  name: string;
  matches: GroupMatch[];
  standings: TeamStanding[];
}

/** Calculate group standings from match results */
export function calculateGroupStandings(
  group: GroupDefinition,
  matchMap: Map<string, { homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null }>
): TeamStanding[] {
  const stats: Record<string, TeamStanding> = {};

  for (const team of group.teams) {
    stats[team] = {
      team,
      flag: TEAM_FLAGS[team] ?? "🏳",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    };
  }

  for (const matchId of group.matchIds) {
    const m = matchMap.get(matchId);
    if (!m || m.homeScore === null || m.awayScore === null) continue;

    const home = stats[m.homeTeam];
    const away = stats[m.awayTeam];
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const s of Object.values(stats)) {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  }

  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
}
