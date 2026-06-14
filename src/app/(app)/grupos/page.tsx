import { GROUPS, TEAM_FLAGS, calculateGroupStandings } from "@/lib/groups";
import { getMatchesWithLiveScores } from "@/lib/live-scores";

export default async function GruposPage() {
  const matches = await getMatchesWithLiveScores();
  const matchMap = new Map(
    matches.map((m) => [
      m.id,
      { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: m.homeScore, awayScore: m.awayScore },
    ])
  );

  const groups = GROUPS.map((group) => ({
    ...group,
    matches: group.matchIds.map((id) => {
      const m = matchMap.get(id);
      return {
        id,
        homeTeam: m?.homeTeam ?? "?",
        homeFlag: TEAM_FLAGS[m?.homeTeam ?? ""] ?? "🏳",
        awayTeam: m?.awayTeam ?? "?",
        awayFlag: TEAM_FLAGS[m?.awayTeam ?? ""] ?? "🏳",
        homeScore: m?.homeScore ?? null,
        awayScore: m?.awayScore ?? null,
      };
    }),
    standings: calculateGroupStandings(group, matchMap),
  }));

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-white font-bold text-xl">Fase de Grupos</h1>
          <p className="text-[#6b7280] text-sm mt-1">Resultados y clasificaciones de los 12 grupos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div key={group.name} className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
              {/* Group header */}
              <div className="px-4 py-3 border-b border-[#2a2d3a] bg-[#13151f]">
                <h2 className="text-white font-bold text-sm">Grupo {group.name}</h2>
              </div>

              {/* Matches */}
              <div className="divide-y divide-[#2a2d3a]">
                {group.matches.map((match) => {
                  const played = match.homeScore !== null;
                  return (
                    <div key={match.id} className="px-4 py-2.5 flex items-center gap-2 text-xs">
                      <span className="flex-1 text-right font-medium text-white truncate">
                        {match.homeFlag} {match.homeTeam}
                      </span>
                      <span className={`tabular-nums font-bold px-2 py-0.5 rounded min-w-[52px] text-center ${
                        played
                          ? "text-white bg-[#2a2d3a]"
                          : "text-[#4b5563]"
                      }`}>
                        {played ? `${match.homeScore} – ${match.awayScore}` : "vs"}
                      </span>
                      <span className="flex-1 text-left font-medium text-white truncate">
                        {match.awayTeam} {match.awayFlag}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Group standings table */}
              <div className="border-t border-[#2a2d3a] px-4 pt-3 pb-4">
                <p className="text-[#6b7280] text-[10px] uppercase tracking-wider font-semibold mb-2">
                  Clasificación
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#4b5563] text-[10px]">
                      <th className="text-left pb-1 font-medium w-5">#</th>
                      <th className="text-left pb-1 font-medium">Equipo</th>
                      <th className="text-right pb-1 font-medium w-5">PJ</th>
                      <th className="text-right pb-1 font-medium w-5">DG</th>
                      <th className="text-right pb-1 font-medium w-7 text-[#ffd700]">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((team, idx) => (
                      <tr key={team.team} className={idx < 2 ? "text-white" : "text-[#6b7280]"}>
                        <td className="py-0.5 font-bold">{idx + 1}</td>
                        <td className="py-0.5">
                          <span className="mr-1">{team.flag}</span>
                          {team.team}
                        </td>
                        <td className="py-0.5 text-right tabular-nums">{team.played}</td>
                        <td className={`py-0.5 text-right tabular-nums ${
                          team.goalDiff > 0 ? "text-[#00c853]" : team.goalDiff < 0 ? "text-red-400" : ""
                        }`}>
                          {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                        </td>
                        <td className="py-0.5 text-right tabular-nums font-bold text-[#ffd700]">
                          {team.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <footer className="border-t border-[#2a2d3a] mt-8 pt-5 pb-2">
          <p className="text-[#6b7280] text-xs">Los dos primeros de cada grupo avanzan a octavos.</p>
        </footer>
      </main>
    </div>
  );
}
