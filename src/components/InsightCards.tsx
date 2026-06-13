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

const insightBg = [
  "border-blue-500/20 bg-blue-500/5",
  "border-green-500/20 bg-green-500/5",
  "border-orange-500/20 bg-orange-500/5",
  "border-red-500/20 bg-red-500/5",
];

export default async function InsightCards() {
  const standings = await getStandings();
  const played = MATCHES.filter((m) => m.homeScore !== null).length;
  const total = MATCHES.filter(
    (m) => !m.homeTeam.toUpperCase().includes("OCTAVO") && !m.homeTeam.toUpperCase().includes("ACERTAR")
  ).length;

  const leader = standings[0];
  const streakLeader = standings.slice(0, 20).reduce(
    (best, s) => {
      const streak = s.lastFive.filter((r) => r === "hit").length;
      return streak > best.streak ? { name: s.participantName, streak } : best;
    },
    { name: "", streak: 0 }
  );
  const mostExact = standings.slice(0, 20).reduce(
    (best, s) => (s.exactScores > best.exactScores ? s : best),
    standings[0] ?? { participantName: "—", exactScores: 0 }
  );
  const lastPlace = standings[standings.length - 1];

  const insights = [
    {
      id: "lider",
      icon: "👑",
      title: "Líder actual",
      value: leader?.participantName ?? "—",
      subtitle: `${leader?.points ?? 0} pts · ${leader?.exactScores ?? 0} exactos`,
    },
    {
      id: "racha",
      icon: "⚡",
      title: "Mejor racha reciente",
      value: streakLeader.name || "—",
      subtitle: `${streakLeader.streak} aciertos en los últimos 5`,
    },
    {
      id: "exactos",
      icon: "🎯",
      title: "Más marcadores exactos",
      value: mostExact?.participantName ?? "—",
      subtitle: `${mostExact?.exactScores ?? 0} marcadores exactos`,
    },
    {
      id: "partidos",
      icon: "📅",
      title: "Progreso del torneo",
      value: `${played} / ${total}`,
      subtitle: `partidos jugados · ${total - played} pendientes`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {insights.map((insight, idx) => (
        <div
          key={insight.id}
          className={`bg-[#1a1d26] border rounded-xl p-4 ${insightBg[idx]}`}
        >
          <div className="text-2xl mb-2">{insight.icon}</div>
          <p className="text-[#9ca3af] text-xs mb-1">{insight.title}</p>
          <p className="text-white font-bold text-sm leading-tight">{insight.value}</p>
          <p className="text-[#6b7280] text-xs mt-1">{insight.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
