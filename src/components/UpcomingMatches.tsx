import { cookies } from "next/headers";
import { Pencil } from "lucide-react";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { TEAM_FLAGS } from "@/lib/groups";
import { applyOverrides } from "@/lib/score-overrides";

export default async function UpcomingMatches() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("porra_identity")?.value;
  const participant = identityId ? PARTICIPANTS.find((p) => p.id === identityId) : null;

  const matches = applyOverrides(MATCHES);

  // Get next 6 unplayed group stage matches (exclude knockout placeholder strings)
  const upcoming = matches
    .filter(
      (m) =>
        m.homeScore === null &&
        !m.homeTeam.toUpperCase().includes("OCTAVO") &&
        !m.homeTeam.toUpperCase().includes("ACERTAR") &&
        !m.homeTeam.toUpperCase().includes("CAMPE")
    )
    .slice(0, 6);

  if (upcoming.length === 0) {
    return (
      <div>
        <h2 className="font-bold text-white mb-3">Próximos Partidos</h2>
        <p className="text-[#6b7280] text-sm">No quedan partidos de grupos pendientes.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-white">Próximos Partidos</h2>
        <span className="text-[#6b7280] text-xs">{upcoming.length} pendientes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {upcoming.map((match) => {
          const prediction = participant?.predictions[match.id];
          const predicted = !!prediction;
          const homeFlag = TEAM_FLAGS[match.homeTeam] ?? "🏳";
          const awayFlag = TEAM_FLAGS[match.awayTeam] ?? "🏳";

          return (
            <div
              key={match.id}
              className={`bg-[#1a1d26] rounded-xl p-4 border-2 transition-colors ${
                predicted ? "border-[#00c853]/40" : "border-[#ffd700]/40"
              }`}
            >
              {/* Badge */}
              <div className="flex items-center justify-end mb-3">
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
                  <div className="text-3xl">{homeFlag}</div>
                  <p className="text-xs font-bold text-white mt-1 max-w-[70px] truncate">{match.homeTeam}</p>
                </div>
                <span className="text-[#6b7280] font-bold text-sm">VS</span>
                <div className="text-center">
                  <div className="text-3xl">{awayFlag}</div>
                  <p className="text-xs font-bold text-white mt-1 max-w-[70px] truncate">{match.awayTeam}</p>
                </div>
              </div>

              {/* Prediction */}
              {predicted ? (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[#9ca3af] text-xs">
                    Tu pronóstico:{" "}
                    <span className="text-white font-bold">
                      {prediction.homeGoals} – {prediction.awayGoals}
                    </span>
                  </p>
                  <Pencil size={13} className="text-[#6b7280]" />
                </div>
              ) : identityId ? (
                <p className="mt-3 text-[#6b7280] text-xs text-center">
                  Sin pronóstico registrado
                </p>
              ) : (
                <a
                  href="/login"
                  className="mt-3 block w-full bg-[#ffd700] text-black text-xs font-bold py-2 rounded-lg hover:bg-yellow-400 transition-colors text-center"
                >
                  SELECCIONA TU IDENTIDAD
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
