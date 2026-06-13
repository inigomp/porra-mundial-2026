import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS, MATCHES } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";
import { applyOverrides } from "@/lib/score-overrides";
import type { Fixture, KillerGoals, StandingEntry } from "@/lib/types";

async function getStandings(): Promise<StandingEntry[]> {
  const cached = getStandingsCache();
  if (cached) return cached.standings;

  const matches = applyOverrides(MATCHES);
  const fixtures: Fixture[] = matches.map((m) => ({
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

/** Simple win probability: inversely proportional to gap from leader */
function estimateProbabilities(standings: StandingEntry[]): Map<string, number> {
  const top = standings.slice(0, 20);
  const maxPts = top[0]?.points ?? 1;
  const minPts = top[top.length - 1]?.points ?? 0;
  const range = maxPts - minPts || 1;

  const raw = new Map<string, number>();
  let total = 0;
  for (const s of top) {
    const score = Math.pow((s.points - minPts) / range, 2) * 90 + 1;
    raw.set(s.participantId, score);
    total += score;
  }
  const result = new Map<string, number>();
  for (const [id, score] of raw) {
    result.set(id, Math.round((score / total) * 100));
  }
  return result;
}

export default async function WinProbabilities() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("porra_identity")?.value;

  const standings = await getStandings();
  const top5 = standings.slice(0, 5);
  const probs = estimateProbabilities(standings);

  // "Otros" = sum of everyone outside top 5
  const top5Prob = top5.reduce((s, e) => s + (probs.get(e.participantId) ?? 0), 0);
  const otrosProb = Math.max(0, 100 - top5Prob);

  // Generate a real insight from the standings
  const leader = standings[0];
  const second = standings[1];
  const gap = leader && second ? leader.points - second.points : 0;
  const currentUser = standings.find((s) => s.participantId === identityId);
  const userRank = currentUser
    ? standings.findIndex((s) => s.participantId === identityId) + 1
    : null;

  const aiInsightText = leader
    ? userRank && userRank <= 3
      ? `¡Estás en el top ${userRank}! ${leader.participantName} lidera con ${leader.points} pts${gap > 0 ? `, ${gap} puntos de ventaja` : " — muy igualado"}. Quedan ${MATCHES.filter((m) => m.homeScore === null).length} partidos.`
      : leader && second
      ? `${leader.participantName} lidera con ${leader.points} pts${gap > 0 ? `, ${gap} por delante de ${second.participantName}` : " — empate en cabeza"}. ${MATCHES.filter((m) => m.homeScore === null).length} partidos pendientes.`
      : "Clasificación en cálculo..."
    : "Sin datos todavía.";

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-5 space-y-5">
      {/* Probabilities */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📊</span>
          <h2 className="font-bold text-white text-sm">Probabilidades de Victoria Final</h2>
        </div>
        <div className="space-y-3">
          {top5.map((entry) => {
            const prob = probs.get(entry.participantId) ?? 0;
            const isCurrentUser = entry.participantId === identityId;
            return (
              <div key={entry.participantId}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${isCurrentUser ? "text-[#ffd700]" : "text-white"}`}>
                    {entry.participantName}
                    {isCurrentUser && " (Tú)"}
                  </span>
                  <span className="font-bold text-white">{prob}%</span>
                </div>
                <div className="h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00c853] to-[#ffd700] transition-all duration-500"
                    style={{ width: `${prob}%` }}
                  />
                </div>
              </div>
            );
          })}
          {otrosProb > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#6b7280]">Otros ({standings.length - 5})</span>
                <span className="text-[#6b7280]">{otrosProb}%</span>
              </div>
              <div className="h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#4b5563]" style={{ width: `${otrosProb}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Insight */}
      <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[#ffd700]" />
          <span className="text-xs font-bold text-[#ffd700]">Situación actual</span>
        </div>
        <p className="text-xs text-[#9ca3af] leading-relaxed">{aiInsightText}</p>
      </div>
    </div>
  );
}
