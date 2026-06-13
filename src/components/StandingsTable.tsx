import { cookies } from "next/headers";
import { Fragment } from "react";
import { Crown } from "lucide-react";
import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS, MATCHES } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";
import { applyOverrides } from "@/lib/score-overrides";
import type { Fixture, KillerGoals, StandingEntry } from "@/lib/types";

const dotColor = {
  hit: "bg-[#00c853]",
  miss: "bg-red-500",
  partial: "bg-yellow-400",
} as const;

async function getStandings(): Promise<StandingEntry[]> {
  const cached = getStandingsCache();
  if (cached) return cached.standings;

  const matches = applyOverrides(MATCHES);
  const fixtures: Fixture[] = matches.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: "",
    awayFlag: "",
    date: "",
    status: m.homeScore !== null ? "FT" : "NS",
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenalties: null,
    awayPenalties: null,
    minute: null,
    phase: "groups",
  }));

  const killerGoals: KillerGoals = { mundialGoals: 0, seleccionGoals: 0 };
  const breakdowns = PARTICIPANTS.map((p) =>
    calculateParticipantScore({ participant: p, fixtures, goalkeeperData: [], killerGoals })
  );
  return buildLeaderboard(breakdowns, fixtures);
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
                      <div className="flex items-center justify-center w-7">
                        {entry.rank === 1 ? (
                          <Crown size={16} className="text-[#ffd700]" />
                        ) : (
                          <span className="text-[#6b7280] font-bold">{entry.rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#2a2d3a] flex items-center justify-center text-xs font-bold text-[#ffd700] flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-white text-sm">{entry.participantName}</p>
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
