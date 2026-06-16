import { cookies } from "next/headers";
import { Fragment } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";
import { getMatchesWithLiveScores } from "@/lib/live-scores";
import { getKillerGoalsBatch, getWCStandings, getAllFinishedWCMatches, normStr, playerKey } from "@/lib/football-data-org";
import { getGoalkeeperPtsMap } from "@/lib/enriched-rankings";
import { buildPlayoffActuals } from "@/lib/playoff-actuals";
import { PLAYOFF_SLOTS } from "@/lib/playoff-slots";
import { getPlayoffActuals } from "@/lib/score-overrides";
import type { Fixture, KillerGoals, StandingEntry } from "@/lib/types";

const dotColor = {
  hit: "bg-[#00c853]",
  miss: "bg-red-500",
  partial: "bg-yellow-400",
} as const;

type StandingsWithDelta = StandingEntry & { rankDelta: number };

async function getStandings(): Promise<StandingsWithDelta[]> {
  // ── Current standings ──────────────────────────────────────────────────────
  const cached = getStandingsCache();

  const [matches, killerGoalsMap, fdoStandings, allFinishedFdo, gkPtsMap] = await Promise.all([
    getMatchesWithLiveScores(),
    cached ? Promise.resolve(new Map<string, number>()) : getKillerGoalsBatch(
      [...new Set(PARTICIPANTS.flatMap(p => [p.killerMundial, p.killerSeleccion]))]
    ),
    cached ? Promise.resolve([]) : getWCStandings(),
    cached ? Promise.resolve([]) : getAllFinishedWCMatches(),
    cached ? Promise.resolve(new Map<string, number>()) : getGoalkeeperPtsMap(),
  ]);
  const playoffActuals = cached ? {} : buildPlayoffActuals(fdoStandings, allFinishedFdo, getPlayoffActuals());

  function lookupGkPts(gkName: string): number {
    const key = playerKey(gkName);
    for (const [mapName, pts] of gkPtsMap.entries()) {
      const mapKey = normStr(mapName);
      const mapWords = mapKey.split(/\s+/);
      if (mapKey.includes(key) || mapWords.some((w) => w === key)) return pts;
    }
    return 0;
  }
  const finishedMatches = matches.filter(
    (m) =>
      m.homeScore !== null &&
      !m.homeTeam.toUpperCase().includes("OCTAVO") &&
      !m.homeTeam.toUpperCase().includes("ACERTAR")
  );

  const toFixture = (m: (typeof finishedMatches)[number]): Fixture => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: "",
    awayFlag: "",
    date: "",
    status: "FT",
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenalties: null,
    awayPenalties: null,
    minute: null,
    phase: "groups",
  });

  let current: StandingEntry[];
  if (cached) {
    current = cached.standings;
  } else {
    const allFixtures = matches.map((m) => ({
      ...toFixture(m),
      status: m.homeScore !== null ? ("FT" as const) : ("NS" as const),
    }));
    const breakdowns = PARTICIPANTS.map((p) => {
      const killerGoals: KillerGoals = {
        mundialGoals: killerGoalsMap.get(p.killerMundial) ?? 0,
        seleccionGoals: killerGoalsMap.get(p.killerSeleccion) ?? 0,
      };
      const bd = calculateParticipantScore({
        participant: p,
        fixtures: allFixtures,
        goalkeeperData: [],
        killerGoals,
        playoffPredictions: PLAYOFF_SLOTS[p.id],
        playoffActuals,
      });
      const gkPts = lookupGkPts(p.goalkeeper);
      return { ...bd, totalFromGoalkeeper: gkPts, grandTotal: bd.grandTotal + gkPts };
    });
    current = buildLeaderboard(breakdowns, allFixtures);
  }

  // ── Previous standings (without the last finished match) ──────────────────
  // Sort by numeric match ID to find the most recently added result
  const sorted = [...finishedMatches].sort(
    (a, b) => parseInt(a.id.replace(/\D/g, "")) - parseInt(b.id.replace(/\D/g, ""))
  );
  const prevMatches = sorted.slice(0, -1); // all except the last finished

  let prevRankMap = new Map<string, number>();
  if (prevMatches.length > 0) {
    const prevFixtures = prevMatches.map(toFixture);
    const prevBreakdowns = PARTICIPANTS.map((p) => {
      const killerGoals: KillerGoals = {
        mundialGoals: killerGoalsMap.get(p.killerMundial) ?? 0,
        seleccionGoals: killerGoalsMap.get(p.killerSeleccion) ?? 0,
      };
      const bd = calculateParticipantScore({
        participant: p,
        fixtures: prevFixtures,
        goalkeeperData: [],
        killerGoals,
        playoffPredictions: PLAYOFF_SLOTS[p.id],
        playoffActuals,
      });
      const gkPts = lookupGkPts(p.goalkeeper);
      return { ...bd, totalFromGoalkeeper: gkPts, grandTotal: bd.grandTotal + gkPts };
    });
    const prevStandings = buildLeaderboard(prevBreakdowns, prevFixtures);
    prevRankMap = new Map(prevStandings.map((s) => [s.participantId, s.rank]));
  }

  // ── Merge ──────────────────────────────────────────────────────────────────
  return current.map((entry) => {
    const prevRank = prevRankMap.get(entry.participantId);
    const rankDelta =
      prevRank === undefined ? 0 : prevRank - entry.rank; // positive = went up
    return { ...entry, rankDelta };
  });
}

export default async function StandingsTable() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("porra_identity")?.value;

  const standings = await getStandings();
  // Show top 10 + current user (if outside top 10)
  const top10 = standings.slice(0, 10);
  const currentEntry = identityId
    ? standings.find((s) => s.participantId === identityId)
    : null;
  const isCurrentInTop10 = currentEntry ? top10.some((s) => s.participantId === identityId) : true;
  const displayList = isCurrentInTop10 ? top10 : [...top10, currentEntry!];

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white">Clasificación General</h2>
        <button className="border border-[#2a2d3a] text-[#9ca3af] text-xs px-3 py-1.5 rounded-lg hover:border-[#ffd700] hover:text-[#ffd700] transition-colors">
          VER DETALLES
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#6b7280] text-xs border-b border-[#2a2d3a]">
              <th className="pb-2 text-left font-medium w-10">Rango</th>
              <th className="pb-2 text-left font-medium">Jugador</th>
              <th className="pb-2 text-right font-medium">Puntos</th>
              <th className="pb-2 text-right font-medium hidden sm:table-cell">Últimas 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2d3a]">
            {displayList.map((entry, idx) => {
              const isCurrentUser = entry.participantId === identityId;
              const initials = entry.participantName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("");
              const exactHits = entry.exactScores;
              const isCurrentUserSeparated = !isCurrentInTop10 && idx === 10;
              const { rankDelta } = entry;

              return (
                <Fragment key={entry.participantId}>
                  {isCurrentUserSeparated && (
                    <tr>
                      <td colSpan={4} className="py-1 text-center">
                        <span className="text-[#4b5563] text-[10px]">···</span>
                      </td>
                    </tr>
                  )}
                  <tr className={isCurrentUser ? "bg-[#ffd700]/5" : ""}>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center justify-center w-7">
                          {entry.rank === 1 ? (
                            <Crown size={16} className="text-[#ffd700]" />
                          ) : (
                            <span className="text-[#6b7280] font-bold">{entry.rank}</span>
                          )}
                        </div>
                        <span className="text-xs w-3 text-center leading-none">
                          {rankDelta > 0 ? (
                            <span className="text-[#00c853]">↑</span>
                          ) : rankDelta < 0 ? (
                            <span className="text-red-400">↓</span>
                          ) : (
                            <span className="text-[#4b5563]">—</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#2a2d3a] flex items-center justify-center text-xs font-bold text-[#ffd700] flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/predicciones/${entry.participantId}`}
                              className="font-semibold text-white text-sm hover:text-[#ffd700] transition-colors"
                            >
                              {entry.participantName}
                            </Link>
                            {isCurrentUser && (
                              <span className="bg-[#ffd700] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                TÚ
                              </span>
                            )}
                          </div>
                          <p className="text-[#6b7280] text-xs">{exactHits} exactos</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold text-white tabular-nums">
                      {entry.points.toLocaleString("es-ES")}
                    </td>
                    <td className="py-3 hidden sm:table-cell">
                      <div className="flex gap-1 justify-end">
                        {entry.lastFive.map((result, i) => (
                          <span
                            key={i}
                            className={`w-3 h-3 rounded-full ${dotColor[result]}`}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
