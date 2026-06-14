import { buildLeaderboard, calculateParticipantScore } from "@/lib/scoring-engine";
import { PARTICIPANTS } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";
import { getMatchesWithLiveScores } from "@/lib/live-scores";
import type { Fixture, KillerGoals } from "@/lib/types";
import DatosTable, { type DatosRow } from "@/components/DatosTable";

async function getRows(): Promise<DatosRow[]> {
  const cached = getStandingsCache();

  let rankMap: Map<string, number>;
  let pointsMap: Map<string, number>;

  if (cached) {
    rankMap = new Map(cached.standings.map((s) => [s.participantId, s.rank]));
    pointsMap = new Map(cached.standings.map((s) => [s.participantId, s.points]));
  } else {
    const matches = await getMatchesWithLiveScores();
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
    const standings = buildLeaderboard(breakdowns, fixtures);
    rankMap = new Map(standings.map((s) => [s.participantId, s.rank]));
    pointsMap = new Map(standings.map((s) => [s.participantId, s.points]));
  }

  return PARTICIPANTS.map((p) => ({
    rank: rankMap.get(p.id) ?? 999,
    participantId: p.id,
    participantName: p.name,
    points: pointsMap.get(p.id) ?? 0,
    killerMundial: p.killerMundial,
    killerSeleccion: p.killerSeleccion,
    goalkeeper: p.goalkeeper,
  })).sort((a, b) => a.rank - b.rank);
}

export default async function DatosPage() {
  const rows = await getRows();

  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-white font-bold text-xl">Datos</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          {rows.length} participantes · filtrá por cualquier columna
        </p>
      </div>
      <DatosTable rows={rows} />
      <p className="text-[#6b7280] text-xs text-center">
        Portero y killer muestran la elección de cada participante, no los puntos actuales.
        Los puntos se actualizan con la sincronización automática.
      </p>
    </main>
  );
}
