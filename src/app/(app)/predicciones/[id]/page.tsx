import Link from "next/link";
import { PARTICIPANTS } from "@/lib/participants";
import { getMatchesWithLiveScores } from "@/lib/live-scores";
import { getMatchResult } from "@/lib/scoring-engine";
import { getKillerGoalsBatch } from "@/lib/football-data-org";
import { getStandingsCache } from "@/lib/standings-cache";

function getMatchPoints(
  prediction: { homeGoals: number; awayGoals: number } | undefined,
  homeScore: number | null,
  awayScore: number | null
): { pts: number; label: string; color: string } | null {
  if (!prediction || homeScore === null || awayScore === null) return null;

  const predResult = getMatchResult(prediction.homeGoals, prediction.awayGoals);
  const actualResult = getMatchResult(homeScore, awayScore);

  if (prediction.homeGoals === homeScore && prediction.awayGoals === awayScore) {
    return { pts: 3, label: "Exacto", color: "text-[#00c853]" };
  }
  if (predResult === actualResult) {
    const predDiff = prediction.homeGoals - prediction.awayGoals;
    const actualDiff = homeScore - awayScore;
    if (predDiff === actualDiff) {
      return { pts: 2, label: "Signo + diff", color: "text-blue-400" };
    }
    return { pts: 1, label: "Signo", color: "text-yellow-400" };
  }
  return { pts: 0, label: "Fallo", color: "text-red-400" };
}

export default async function ParticipantPrediccionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const participant = PARTICIPANTS.find((p) => p.id === id);
  if (!participant) {
    return (
      <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6">
        <p className="text-[#9ca3af]">Participante no encontrado.</p>
      </main>
    );
  }

  const allMatches = await getMatchesWithLiveScores();

  // Fetch killer goals and GK points in parallel
  const killerGoalsMap = await getKillerGoalsBatch([
    participant.killerMundial,
    participant.killerSeleccion,
  ]);
  const mundialGoals = killerGoalsMap.get(participant.killerMundial) ?? 0;
  const seleccionGoals = killerGoalsMap.get(participant.killerSeleccion) ?? 0;
  const mundialPts = mundialGoals * 2;
  const seleccionPts = seleccionGoals * 1;

  // GK points from enriched cache if available
  const cached = getStandingsCache();
  const gkPts = cached?.goalkeeperPoints[participant.id] ?? null;
  const matches = allMatches.filter(
    (m) =>
      !m.homeTeam.toUpperCase().includes("OCTAVO") &&
      !m.homeTeam.toUpperCase().includes("ACERTAR")
  );

  const played = matches.filter((m) => m.homeScore !== null);
  const pending = matches.filter((m) => m.homeScore === null);

  let matchPts = 0;
  let exact = 0;
  played.forEach((m) => {
    const r = getMatchPoints(participant.predictions[m.id], m.homeScore, m.awayScore);
    if (r) {
      matchPts += r.pts;
      if (r.pts === 3) exact++;
    }
  });

  const totalPts = matchPts + mundialPts + seleccionPts + (gkPts ?? 0);
  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/clasificacion"
            className="text-[#6b7280] text-xs hover:text-white transition-colors mb-2 inline-flex items-center gap-1"
          >
            ← Clasificación
          </Link>
          <h1 className="text-white font-bold text-xl">{participant.name}</h1>
          <p className="text-[#6b7280] text-sm mt-1">Predicciones de fase de grupos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-4 py-3 text-center">
            <p className="text-[#00c853] font-bold text-xl">{totalPts}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">puntos</p>
          </div>
          <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-4 py-3 text-center">
            <p className="text-blue-400 font-bold text-xl">{exact}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">exactos</p>
          </div>
          <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-4 py-3 text-center">
            <p className="text-white font-bold text-xl">{played.length}/{matches.length}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">jugados</p>
          </div>
        </div>
      </div>

      {/* Extras */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[#6b7280] text-xs mb-0.5">Portero</p>
          <p className="text-white text-sm font-semibold">{participant.goalkeeper}</p>
          <p className="text-[#ffd700] text-xs mt-1 font-mono">
            {gkPts !== null ? `${gkPts} pts` : <span className="text-[#4b5563]">pendiente</span>}
          </p>
        </div>
        <div>
          <p className="text-[#6b7280] text-xs mb-0.5">Killer mundial</p>
          <p className="text-white text-sm font-semibold">{participant.killerMundial}</p>
          <p className="text-[#ffd700] text-xs mt-1 font-mono">
            {mundialGoals} goles · {mundialPts} pts
          </p>
        </div>
        <div>
          <p className="text-[#6b7280] text-xs mb-0.5">Killer selección</p>
          <p className="text-white text-sm font-semibold">{participant.killerSeleccion}</p>
          <p className="text-[#ffd700] text-xs mt-1 font-mono">
            {seleccionGoals} goles · {seleccionPts} pts
          </p>
        </div>
      </div>

      {/* Played matches */}
      {played.length > 0 && (
        <section>
          <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest mb-3">
            Partidos jugados ({played.length})
          </h2>
          <div className="space-y-2">
            {played.map((m) => {
              const pred = participant.predictions[m.id];
              const result = getMatchPoints(pred, m.homeScore, m.awayScore);
              return (
                <div
                  key={m.id}
                  className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {m.homeTeam} vs {m.awayTeam}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Real</p>
                    <p className="text-white font-bold text-sm">
                      {m.homeScore} – {m.awayScore}
                    </p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Su pred.</p>
                    <p className="text-white font-bold text-sm">
                      {pred ? `${pred.homeGoals} – ${pred.awayGoals}` : "—"}
                    </p>
                  </div>
                  <div className="text-center w-20">
                    {result ? (
                      <>
                        <p className={`font-bold text-sm ${result.color}`}>
                          {result.pts > 0 ? `+${result.pts}` : result.pts} pts
                        </p>
                        <p className={`text-xs ${result.color}`}>{result.label}</p>
                      </>
                    ) : (
                      <p className="text-[#6b7280] text-xs">Sin pred.</p>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending matches */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest mb-3">
            Pendientes ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.slice(0, 20).map((m) => {
              const pred = participant.predictions[m.id];
              return (
                <div
                  key={m.id}
                  className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 opacity-70"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {m.homeTeam} vs {m.awayTeam}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Real</p>
                    <p className="text-[#6b7280] font-bold text-sm">–</p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Su pred.</p>
                    <p className="text-white font-bold text-sm">
                      {pred ? `${pred.homeGoals} – ${pred.awayGoals}` : "—"}
                    </p>
                  </div>
                  <div className="text-center w-20">
                    <p className="text-[#6b7280] text-xs">Pendiente</p>
                  </div>
                  </div>
                </div>
              );
            })}
            {pending.length > 20 && (
              <p className="text-[#6b7280] text-xs text-center pt-2">
                +{pending.length - 20} partidos más pendientes
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
