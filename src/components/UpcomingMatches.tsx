import { upcomingMatches } from "@/lib/mock-data";
import { Pencil } from "lucide-react";

export default function UpcomingMatches() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-white">Próximos Partidos</h2>
        <div className="flex gap-1">
          <button className="w-7 h-7 rounded-full bg-[#1a1d26] border border-[#2a2d3a] flex items-center justify-center text-[#6b7280] hover:text-white transition-colors text-xs">
            ‹
          </button>
          <button className="w-7 h-7 rounded-full bg-[#1a1d26] border border-[#2a2d3a] flex items-center justify-center text-[#6b7280] hover:text-white transition-colors text-xs">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {upcomingMatches.map((match) => {
          const predicted = match.userPrediction !== null;
          return (
            <div
              key={match.id}
              className={`bg-[#1a1d26] rounded-xl p-4 border-2 transition-colors ${
                predicted
                  ? "border-[#00c853]/40"
                  : "border-[#ffd700]/40"
              }`}
            >
              {/* Date + badge */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#6b7280] text-xs">
                  {match.date} · {match.time}
                </p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    predicted
                      ? "bg-[#00c853]/20 text-[#00c853]"
                      : "bg-[#ffd700]/20 text-[#ffd700]"
                  }`}
                >
                  {predicted ? "Predicho" : "Sin Predicción"}
                </span>
              </div>

              {/* Teams */}
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="text-center">
                  <div className="text-3xl">{match.homeFlag}</div>
                  <p className="text-xs font-bold text-white mt-1">{match.homeTeam}</p>
                </div>
                <span className="text-[#6b7280] font-bold text-sm">VS</span>
                <div className="text-center">
                  <div className="text-3xl">{match.awayFlag}</div>
                  <p className="text-xs font-bold text-white mt-1">{match.awayTeam}</p>
                </div>
              </div>

              {/* Prediction or CTA */}
              {predicted ? (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[#9ca3af] text-xs">
                    Tu pronóstico:{" "}
                    <span className="text-white font-bold">
                      {match.userPrediction!.home} – {match.userPrediction!.away}
                    </span>
                  </p>
                  <button className="text-[#6b7280] hover:text-[#ffd700] transition-colors">
                    <Pencil size={13} />
                  </button>
                </div>
              ) : (
                <button className="mt-3 w-full bg-[#ffd700] text-black text-xs font-bold py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                  PRONOSTICAR AHORA
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
