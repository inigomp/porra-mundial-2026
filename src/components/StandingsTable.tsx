import { players } from "@/lib/mock-data";
import { Crown } from "lucide-react";

const dotColor = {
  hit: "bg-[#00c853]",
  miss: "bg-red-500",
  partial: "bg-yellow-400",
} as const;

export default function StandingsTable() {
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
            {players.filter((p) => p.id !== "otros").map((player, idx) => (
              <tr
                key={player.id}
                className={`${player.isCurrentUser ? "bg-[#ffd700]/5" : ""}`}
              >
                <td className="py-3 pr-2">
                  <div className="flex items-center justify-center w-7">
                    {idx === 0 ? (
                      <Crown size={16} className="text-[#ffd700]" />
                    ) : (
                      <span className="text-[#6b7280] font-bold">{idx + 1}</span>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#2a2d3a] flex items-center justify-center text-xs font-bold text-[#ffd700] flex-shrink-0">
                      {player.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white text-sm">{player.name}</p>
                        {player.isCurrentUser && (
                          <span className="bg-[#ffd700] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            TÚ
                          </span>
                        )}
                      </div>
                      <p className="text-[#6b7280] text-xs">{player.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-right font-bold text-white tabular-nums">
                  {player.points.toLocaleString("es-ES")}
                </td>
                <td className="py-3 hidden sm:table-cell">
                  <div className="flex gap-1 justify-end">
                    {player.lastFive.map((result, i) => (
                      <span
                        key={i}
                        className={`w-3 h-3 rounded-full ${dotColor[result]}`}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
