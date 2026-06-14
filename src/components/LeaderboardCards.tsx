import { getEnrichedRankings } from "@/lib/enriched-rankings";
import type { GkRankEntry, KillerRankEntry } from "@/lib/enriched-rankings";

function RankBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-base leading-none">🥇</span>;
  if (pos === 2) return <span className="text-base leading-none">🥈</span>;
  if (pos === 3) return <span className="text-base leading-none">🥉</span>;
  return <span className="text-[#6b7280] text-xs font-bold w-5 text-center tabular-nums">{pos}</span>;
}

export default async function LeaderboardCards() {
  const { killerMundial, killerSeleccion, topGoalkeepers } = await getEnrichedRankings();

  const spainYetToScore = killerSeleccion.length > 0 && killerSeleccion.every((k) => k.goals === 0);

  return (
    <div className="space-y-4">
      {/* Top 5 porteros */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          🧤 <span>Top porteros</span>
        </h3>
        {topGoalkeepers.length === 0 ? (
          <p className="text-[#4b5563] text-xs">Sin partidos disputados aún</p>
        ) : (
          <div className="space-y-2.5">
            {topGoalkeepers.map((gk: GkRankEntry, i) => (
              <div key={gk.name} className="flex items-center gap-2">
                <div className="w-5 flex justify-center flex-shrink-0">
                  <RankBadge pos={i + 1} />
                </div>
                <span className="text-white text-sm flex-1 min-w-0 truncate">{gk.name}</span>
                <span className="text-[#ffd700] font-bold text-sm tabular-nums flex-shrink-0">
                  {gk.pts} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Killer del mundial */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          ⚽ <span>Killer mundial</span>
        </h3>
        {killerMundial.length === 0 ? (
          <p className="text-[#4b5563] text-xs">Sin goles registrados aún</p>
        ) : (
          <div className="space-y-2.5">
            {killerMundial.map((k: KillerRankEntry, i) => (
              <div key={k.name} className="flex items-center gap-2">
                <div className="w-5 flex justify-center flex-shrink-0">
                  <RankBadge pos={i + 1} />
                </div>
                <span className="text-white text-sm flex-1 min-w-0 truncate">{k.name}</span>
                <span className="text-[#00c853] font-bold text-sm tabular-nums flex-shrink-0">
                  {k.goals} gol{k.goals !== 1 ? "es" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Killer selección española */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          🔴 <span>Killer selección</span>
        </h3>
        {killerSeleccion.length === 0 ? (
          <p className="text-[#4b5563] text-xs">Sin goles registrados aún</p>
        ) : (
          <>
            {spainYetToScore && (
              <p className="text-[#4b5563] text-xs mb-2">España aún no ha marcado</p>
            )}
            <div className="space-y-2.5">
              {killerSeleccion.map((k: KillerRankEntry, i) => (
                <div key={k.name} className="flex items-center gap-2">
                  <div className="w-5 flex justify-center flex-shrink-0">
                    <RankBadge pos={i + 1} />
                  </div>
                  <span className={`text-sm flex-1 min-w-0 truncate ${spainYetToScore ? "text-[#6b7280]" : "text-white"}`}>{k.name}</span>
                  <span className="text-[#00c853] font-bold text-sm tabular-nums flex-shrink-0">
                    {k.goals} gol{k.goals !== 1 ? "es" : ""}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
