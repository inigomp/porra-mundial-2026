import { liveMatches } from "@/lib/mock-data";
import { TrendingUp } from "lucide-react";

export default function LiveBanner() {
  if (liveMatches.length === 0) return null;

  const match = liveMatches[0];

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
      {/* Score */}
      <div className="flex items-center gap-6 flex-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{match.homeFlag}</span>
          <div className="text-center">
            <p className="text-xs font-bold text-[#9ca3af] tracking-wider">{match.homeTeam}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-3xl font-black text-white tracking-tight">
            {match.homeScore} – {match.awayScore}
          </p>
          <span className="inline-block bg-[#00c853]/20 text-[#00c853] text-xs font-bold px-2.5 py-0.5 rounded-full mt-1">
            {match.minute}&apos; MIN
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-xs font-bold text-[#9ca3af] tracking-wider">{match.awayTeam}</p>
          </div>
          <span className="text-3xl">{match.awayFlag}</span>
        </div>
      </div>

      {/* Goalkeepers */}
      <div className="flex gap-4 text-xs text-[#6b7280]">
        <div className="flex items-center gap-1">
          <span>🧤</span>
          <span className={match.homeGk.redCard ? "text-red-400 line-through" : match.homeGk.substituted ? "text-yellow-400" : ""}>
            {match.homeGk.name}
          </span>
          {match.homeGk.substituted && <span title="Sustituido">↔️</span>}
          {match.homeGk.redCard && <span title="Expulsado">🟥</span>}
        </div>
        <div className="flex items-center gap-1">
          <span>🧤</span>
          <span className={match.awayGk.redCard ? "text-red-400 line-through" : match.awayGk.substituted ? "text-yellow-400" : ""}>
            {match.awayGk.name}
          </span>
          {match.awayGk.substituted && <span title="Sustituido">↔️</span>}
          {match.awayGk.redCard && <span title="Expulsado">🟥</span>}
        </div>
      </div>

      {/* Table projection */}
      <div className="bg-[#2a2d1a] border border-[#ffd700]/30 rounded-lg px-4 py-3 text-right flex-shrink-0 min-w-[180px]">
        <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold">Proyección de Tabla</p>
        <p className="text-sm font-bold text-white mt-0.5">
          Clasificación si gana {match.tableProjection.player}
        </p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <TrendingUp size={13} className="text-[#ffd700]" />
          <span className="text-[#ffd700] font-bold text-sm">
            +{match.tableProjection.pointsDelta} pts
          </span>
        </div>
      </div>
    </div>
  );
}
