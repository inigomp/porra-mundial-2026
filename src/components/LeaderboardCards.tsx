import { PARTICIPANTS } from "@/lib/participants";
import { getStandingsCache } from "@/lib/standings-cache";

function RankBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-base leading-none">🥇</span>;
  if (pos === 2) return <span className="text-base leading-none">🥈</span>;
  if (pos === 3) return <span className="text-base leading-none">🥉</span>;
  return <span className="text-[#6b7280] text-xs font-bold w-5 text-center tabular-nums">{pos}</span>;
}

export default function LeaderboardCards() {
  const cache = getStandingsCache();
  const killerGoals = cache?.killerGoals ?? {};
  const goalkeeperPoints = cache?.goalkeeperPoints ?? {};
  const hasData = !!cache;

  // Top 5 goalkeepers by points
  const gkMap = new Map<string, number>();
  for (const p of PARTICIPANTS) {
    const pts = goalkeeperPoints[p.id] ?? 0;
    gkMap.set(p.goalkeeper, Math.max(gkMap.get(p.goalkeeper) ?? 0, pts));
  }
  const gkRanking = [...gkMap.entries()]
    .map(([name, pts]) => ({ name, pts }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 5);

  // Killers by goals — mundial
  const mundialMap = new Map<string, number>();
  for (const p of PARTICIPANTS) {
    const goals = killerGoals[p.id]?.mundialGoals ?? 0;
    mundialMap.set(p.killerMundial, Math.max(mundialMap.get(p.killerMundial) ?? 0, goals));
  }
  const mundialRanking = [...mundialMap.entries()]
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  // Killers by goals — selección
  const seleccionMap = new Map<string, number>();
  for (const p of PARTICIPANTS) {
    const goals = killerGoals[p.id]?.seleccionGoals ?? 0;
    seleccionMap.set(p.killerSeleccion, Math.max(seleccionMap.get(p.killerSeleccion) ?? 0, goals));
  }
  const seleccionRanking = [...seleccionMap.entries()]
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Top 5 porteros */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          🧤 <span>Top porteros</span>
        </h3>
        {!hasData ? (
          <p className="text-[#4b5563] text-xs">Pendiente de sincronización con la API</p>
        ) : (
          <div className="space-y-2.5">
            {gkRanking.map((gk, i) => (
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
        {!hasData ? (
          <p className="text-[#4b5563] text-xs">Pendiente de sincronización con la API</p>
        ) : (
          <div className="space-y-2.5">
            {mundialRanking.map((k, i) => (
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
        {!hasData ? (
          <p className="text-[#4b5563] text-xs">Pendiente de sincronización con la API</p>
        ) : (
          <div className="space-y-2.5">
            {seleccionRanking.map((k, i) => (
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
    </div>
  );
}
