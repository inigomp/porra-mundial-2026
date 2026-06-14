import { cookies } from "next/headers";
import Link from "next/link";
import { PARTICIPANTS, MATCHES } from "@/lib/participants";
import { applyOverrides } from "@/lib/score-overrides";
import { getMatchResult } from "@/lib/scoring-engine";

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

export default async function PrediccionesPage() {
  const cookieStore = await cookies();
  const identity = cookieStore.get("porra_identity")?.value;

  if (!identity) {
    return (
      <main className="ml-56 mt-14 flex-1 p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-4xl">🔒</p>
          <h2 className="text-white font-bold text-lg">Identifica quién eres primero</h2>
          <p className="text-[#6b7280] text-sm">Necesitas seleccionar tu identidad para ver tus predicciones</p>
          <Link
            href="/login"
            className="bg-[#00c853] text-black font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-green-400 transition-colors"
          >
            Seleccionar identidad
          </Link>
        </div>
      </main>
    );
  }

  const participant = PARTICIPANTS.find((p) => p.id === identity);
  if (!participant) {
    return (
      <main className="ml-56 mt-14 flex-1 p-6">
        <p className="text-[#9ca3af]">Participante no encontrado.</p>
      </main>
    );
  }

  const matches = applyOverrides(MATCHES).filter(
    (m) =>
      !m.homeTeam.toUpperCase().includes("OCTAVO") &&
      !m.homeTeam.toUpperCase().includes("ACERTAR")
  );

  const played = matches.filter((m) => m.homeScore !== null);
  const pending = matches.filter((m) => m.homeScore === null);

  let totalPts = 0;
  let exact = 0;
  played.forEach((m) => {
    const r = getMatchPoints(participant.predictions[m.id], m.homeScore, m.awayScore);
    if (r) {
      totalPts += r.pts;
      if (r.pts === 3) exact++;
    }
  });

  return (
    <main className="ml-56 mt-14 flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Mis predicciones</h1>
          <p className="text-[#6b7280] text-sm mt-1">{participant.name}</p>
        </div>
        <div className="flex gap-4">
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
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 flex gap-8">
        <div>
          <p className="text-[#6b7280] text-xs mb-0.5">Portero</p>
          <p className="text-white text-sm font-semibold">{participant.goalkeeper}</p>
        </div>
        <div>
          <p className="text-[#6b7280] text-xs mb-0.5">Killer mundial</p>
          <p className="text-white text-sm font-semibold">{participant.killerMundial}</p>
        </div>
        <div>
          <p className="text-[#6b7280] text-xs mb-0.5">Killer selección</p>
          <p className="text-white text-sm font-semibold">{participant.killerSeleccion}</p>
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
                  className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-4 py-3 flex items-center gap-4"
                >
                  {/* Teams */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {m.homeTeam} vs {m.awayTeam}
                    </p>
                  </div>
                  {/* Actual */}
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Real</p>
                    <p className="text-white font-bold text-sm">
                      {m.homeScore} – {m.awayScore}
                    </p>
                  </div>
                  {/* Predicted */}
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Tu pred.</p>
                    <p className="text-white font-bold text-sm">
                      {pred ? `${pred.homeGoals} – ${pred.awayGoals}` : "—"}
                    </p>
                  </div>
                  {/* Points */}
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
                  className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-4 py-3 flex items-center gap-4 opacity-70"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {m.homeTeam} vs {m.awayTeam}
                    </p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Real</p>
                    <p className="text-[#6b7280] font-bold text-sm">–</p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-[#6b7280] text-xs mb-0.5">Tu pred.</p>
                    <p className="text-white font-bold text-sm">
                      {pred ? `${pred.homeGoals} – ${pred.awayGoals}` : "—"}
                    </p>
                  </div>
                  <div className="text-center w-20">
                    <p className="text-[#6b7280] text-xs">Pendiente</p>
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
