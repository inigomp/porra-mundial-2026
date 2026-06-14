import { getMatchesWithLiveScores } from "@/lib/live-scores";

export default async function DirectoPage() {
  const matches = await getMatchesWithLiveScores();

  const allPlayed = matches.filter((m) => m.homeScore !== null);

  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-white font-bold text-xl">En vivo</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Resultados en tiempo real — actualización automática cada 5 minutos
        </p>
      </div>

      {/* Live status */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">📡</div>
        <h2 className="text-white font-semibold text-base mb-1">Sin partidos en directo ahora mismo</h2>
        <p className="text-[#6b7280] text-sm">
          Los resultados se sincronizan automáticamente cada 5 minutos cuando hay partidos en juego.
        </p>
      </div>

      {/* Recently played */}
      {allPlayed.length > 0 && (
        <section>
          <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest mb-3">
            Resultados ({allPlayed.length})
          </h2>
          <div className="space-y-2">
            {allPlayed.map((m) => (
              <div
                key={m.id}
                className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl px-5 py-3 flex items-center"
              >
                <span className="text-[#6b7280] text-xs bg-[#2a2d3a] px-2 py-0.5 rounded mr-4 shrink-0">
                  FT
                </span>
                <span className="text-white text-sm font-medium flex-1">{m.homeTeam}</span>
                <span className="text-[#00c853] font-bold text-base mx-4 tabular-nums">
                  {m.homeScore} – {m.awayScore}
                </span>
                <span className="text-white text-sm font-medium flex-1 text-right">{m.awayTeam}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sync info */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 flex items-start gap-3">
        <span className="text-[#00c853] text-lg mt-0.5">ℹ️</span>
        <div>
          <p className="text-white text-sm font-medium">Cómo funciona la sincronización</p>
          <p className="text-[#6b7280] text-xs mt-1 leading-relaxed">
            Un cron job de GitHub Actions llama a <code className="text-[#9ca3af] bg-[#2a2d3a] px-1 rounded">/api/cron/sync-scores</code> cada 5 minutos
            entre las 10:00 y las 23:00 UTC. Los datos vienen de la API football-data.org.
            El portero y el killer se calculan automáticamente de los eventos de los partidos.
          </p>
        </div>
      </div>
    </main>
  );
}
