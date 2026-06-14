import { cookies } from "next/headers";
import Link from "next/link";
import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";
import { getMatchesWithLiveScores } from "@/lib/live-scores";
import type { Fixture, KillerGoals, StandingEntry } from "@/lib/types";

async function getStandings(): Promise<StandingEntry[]> {
  const cached = getStandingsCache();
  if (cached) return cached.standings;

  const liveMatches = await getMatchesWithLiveScores();
  const fixtures: Fixture[] = liveMatches.map((m) => ({
    id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
    homeFlag: "", awayFlag: "", date: "",
    status: m.homeScore !== null ? "FT" : "NS",
    homeScore: m.homeScore, awayScore: m.awayScore,
    homePenalties: null, awayPenalties: null, minute: null, phase: "groups",
  }));
  const killerGoals: KillerGoals = { mundialGoals: 0, seleccionGoals: 0 };
  const breakdowns = PARTICIPANTS.map((p) =>
    calculateParticipantScore({ participant: p, fixtures, goalkeeperData: [], killerGoals })
  );
  return buildLeaderboard(breakdowns, fixtures);
}

function PodiumBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-base">🥇</span>;
  if (pos === 2) return <span className="text-base">🥈</span>;
  if (pos === 3) return <span className="text-base">🥉</span>;
  return <span className="text-[#6b7280] text-xs font-bold w-5 text-center">{pos}</span>;
}

export default async function ClasificacionPage() {
  const cookieStore = await cookies();
  const identity = cookieStore.get("porra_identity")?.value;
  const standings = await getStandings();

  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-white font-bold text-xl">Clasificación completa</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          {standings.length} participantes · ordenado por puntos
        </p>
      </div>

      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[420px]">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_4rem_3rem_3rem_4rem] gap-2 px-4 py-2.5 border-b border-[#2a2d3a] text-[#6b7280] text-xs font-semibold uppercase tracking-widest">
          <span>#</span>
          <span>Participante</span>
          <span className="text-right">Pts</span>
          <span className="text-right hidden sm:block">Exactos</span>
          <span className="text-right hidden sm:block">Signos</span>
          <span className="text-right hidden sm:block">Últ. 5</span>
        </div>

        {standings.map((entry, idx) => {
          const isMe = entry.participantId === identity;
          return (
            <div
              key={entry.participantId}
              className={`grid grid-cols-[2rem_1fr_4rem_3rem_3rem_4rem] gap-2 px-4 py-3 border-b border-[#2a2d3a] last:border-0 items-center ${
                isMe ? "bg-[#00c853]/10 border-l-2 border-l-[#00c853]" : "hover:bg-[#1e2130]"
              }`}
            >
              <div className="flex items-center justify-start">
                <PodiumBadge pos={idx + 1} />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/predicciones/${entry.participantId}`}
                  className="text-white text-sm font-medium truncate block hover:text-[#00c853] transition-colors"
                >
                  {entry.participantName}
                  {isMe && (
                    <span className="ml-2 text-[#00c853] text-xs font-bold bg-[#00c853]/20 px-1.5 py-0.5 rounded">
                      TÚ
                    </span>
                  )}
                </Link>
              </div>
              <div className="text-right">
                <span className="text-[#00c853] font-bold text-sm">{entry.points}</span>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-blue-400 text-sm">{entry.exactScores}</span>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[#9ca3af] text-sm">{entry.correctResults}</span>
              </div>
              <div className="text-right hidden sm:flex items-center justify-end gap-0.5">
                {entry.lastFive.map((r, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full inline-block ${
                      r === "hit" ? "bg-[#00c853]" : r === "miss" ? "bg-red-500" : "bg-[#3a3d4a]"
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
        </div>
        </div>
      </div>

      <p className="text-[#6b7280] text-xs text-center">
        Portero y killer no incluidos — se actualizan con la sincronización automática de la API
      </p>
    </main>
  );
}
