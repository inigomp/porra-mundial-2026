import { players, aiInsight } from "@/lib/mock-data";
import { Sparkles } from "lucide-react";

export default function WinProbabilities() {
  const ranked = players.filter((p) => p.id !== "otros");
  const otros = players.find((p) => p.id === "otros");

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-5 space-y-5">
      {/* Probabilities */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📊</span>
          <h2 className="font-bold text-white text-sm">Probabilidades de Victoria Final</h2>
        </div>
        <div className="space-y-3">
          {ranked.map((player) => (
            <div key={player.id}>
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-medium ${player.isCurrentUser ? "text-[#ffd700]" : "text-white"}`}>
                  {player.name}
                  {player.isCurrentUser && " (Tú)"}
                </span>
                <span className="font-bold text-white">{player.winProbability}%</span>
              </div>
              <div className="h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00c853] to-[#ffd700] transition-all duration-500"
                  style={{ width: `${player.winProbability}%` }}
                />
              </div>
            </div>
          ))}
          {otros && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#6b7280]">Otros</span>
                <span className="text-[#6b7280]">{otros.winProbability}%</span>
              </div>
              <div className="h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#4b5563]"
                  style={{ width: `${otros.winProbability}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[#ffd700]" />
          <span className="text-xs font-bold text-[#ffd700]">Insight de la IA</span>
        </div>
        <p className="text-xs text-[#9ca3af] leading-relaxed">{aiInsight}</p>
      </div>
    </div>
  );
}
