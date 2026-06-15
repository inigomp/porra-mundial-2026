import { getWCStandings, getAllFinishedWCMatches } from "@/lib/football-data-org";
import { buildPlayoffActuals, BRACKET, type BracketEntry } from "@/lib/playoff-actuals";
import { getPlayoffActuals } from "@/lib/score-overrides";
import type { PlayoffActuals } from "@/lib/types";

// ─── Static round structure ───────────────────────────────────────────────────

interface Round {
  label: string;
  entries: BracketEntry[];
}

function buildRounds(): Round[] {
  return [
    {
      label: "Dieciseisavos de final",
      entries: BRACKET.slice(0, 16),
    },
    {
      label: "Octavos de final",
      entries: BRACKET.slice(16, 24),
    },
    {
      label: "Cuartos de final",
      entries: BRACKET.slice(24, 28),
    },
    {
      label: "Semifinales",
      entries: BRACKET.slice(28, 30),
    },
    {
      label: "Final",
      entries: BRACKET.slice(30, 31),
    },
  ];
}

// ─── Team display helpers ─────────────────────────────────────────────────────

function TeamChip({
  team,
  isWinner,
  isPending,
}: {
  team: string | null;
  isWinner: boolean;
  isPending: boolean;
}) {
  if (!team) {
    return (
      <span className="text-[#4b5563] text-xs italic">
        {isPending ? "Pendiente" : "—"}
      </span>
    );
  }
  return (
    <span
      className={`text-sm font-semibold truncate ${
        isWinner
          ? "text-[#00c853]"
          : isPending
          ? "text-white"
          : "text-[#6b7280]"
      }`}
    >
      {team}
    </span>
  );
}

function MatchCard({
  entry,
  actuals,
}: {
  entry: BracketEntry;
  actuals: PlayoffActuals;
}) {
  const team1 = actuals[entry.slot1] ?? null;
  const team2 = actuals[entry.slot2] ?? null;
  const winner = actuals[entry.winnerSlot] ?? null;

  const bothKnown = team1 !== null && team2 !== null;
  const finished = winner !== null;

  return (
    <div
      className={`bg-[#1a1d26] border rounded-xl px-4 py-3 flex flex-col gap-1.5 ${
        finished ? "border-[#2a2d3a]" : "border-[#2a2d3a] opacity-70"
      }`}
    >
      {/* Team 1 */}
      <div className="flex items-center justify-between gap-2">
        <TeamChip
          team={team1}
          isWinner={finished && team1 === winner}
          isPending={!bothKnown}
        />
        {finished && team1 === winner && (
          <span className="text-[#00c853] text-xs font-bold flex-shrink-0">✓</span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[#2a2d3a]" />

      {/* Team 2 */}
      <div className="flex items-center justify-between gap-2">
        <TeamChip
          team={team2}
          isWinner={finished && team2 === winner}
          isPending={!bothKnown}
        />
        {finished && team2 === winner && (
          <span className="text-[#00c853] text-xs font-bold flex-shrink-0">✓</span>
        )}
      </div>

      {/* Status label */}
      {!finished && (
        <p className="text-[#4b5563] text-[10px] mt-0.5">
          {!team1 && !team2
            ? "Cruces pendientes"
            : !bothKnown
            ? "Un equipo pendiente"
            : "Por disputar"}
        </p>
      )}
    </div>
  );
}

// ─── Group qualifiers summary ─────────────────────────────────────────────────

function GroupQualifiers({ actuals }: { actuals: PlayoffActuals }) {
  const groups = "ABCDEFGHIJKL".split("");
  const rows = groups.map((g) => ({
    group: g,
    first: actuals[`1º grupo ${g}`] ?? null,
    second: actuals[`2º grupo ${g}`] ?? null,
  }));

  const anyKnown = rows.some((r) => r.first || r.second);
  if (!anyKnown) return null;

  return (
    <section>
      <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest mb-3">
        Clasificados de grupos
      </h2>
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-3 px-4 py-2 border-b border-[#2a2d3a] text-[#6b7280] text-[10px] font-semibold uppercase">
          <span>Grupo</span>
          <span>1º</span>
          <span>2º</span>
        </div>
        {rows.map(({ group, first, second }) => (
          <div
            key={group}
            className="grid grid-cols-[2rem_1fr_1fr] gap-x-3 px-4 py-2.5 border-b border-[#2a2d3a] last:border-0 items-center"
          >
            <span className="text-[#ffd700] font-bold text-xs">{group}</span>
            <span className="text-white text-xs truncate">
              {first ?? <span className="text-[#4b5563]">—</span>}
            </span>
            <span className="text-white text-xs truncate">
              {second ?? <span className="text-[#4b5563]">—</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Special: Third place + Champion ──────────────────────────────────────────

function FinalSummary({ actuals }: { actuals: PlayoffActuals }) {
  const finalist1 = actuals["FINALISTA 1"] ?? null;
  const finalist2 = actuals["FINALISTA 2"] ?? null;
  const champion = actuals["CAMPEÖN"] ?? null;
  const third = actuals["TERCER PUESTO"] ?? null;

  if (!finalist1 && !finalist2) return null;

  return (
    <section>
      <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest mb-3">
        Fase final
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Final */}
        <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs mb-2 font-semibold uppercase tracking-wider">Final</p>
          <div className="space-y-1">
            <p className={`text-sm font-bold ${champion && finalist1 === champion ? "text-[#ffd700]" : "text-white"}`}>
              {finalist1 ?? <span className="text-[#4b5563]">Pendiente</span>}
              {champion && finalist1 === champion && " 🏆"}
            </p>
            <p className={`text-sm font-bold ${champion && finalist2 === champion ? "text-[#ffd700]" : "text-white"}`}>
              {finalist2 ?? <span className="text-[#4b5563]">Pendiente</span>}
              {champion && finalist2 === champion && " 🏆"}
            </p>
          </div>
        </div>

        {/* Third place */}
        {third && (
          <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs mb-2 font-semibold uppercase tracking-wider">Tercer puesto</p>
            <p className="text-white text-sm font-bold">{third} 🥉</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EliminatoriaPage() {
  const [fdoStandings, allFinishedFdo] = await Promise.all([
    getWCStandings(),
    getAllFinishedWCMatches(),
  ]);

  const actuals = buildPlayoffActuals(fdoStandings, allFinishedFdo, getPlayoffActuals());
  const rounds = buildRounds();
  const totalResolved = Object.keys(actuals).length;

  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white font-bold text-xl">Fase eliminatoria</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          {totalResolved > 0
            ? `${totalResolved} resultados conocidos · actualizado cada 60s`
            : "El torneo eliminatorio aún no ha comenzado"}
        </p>
      </div>

      {/* Final summary (shown at top when available) */}
      <FinalSummary actuals={actuals} />

      {/* Group qualifiers */}
      <GroupQualifiers actuals={actuals} />

      {/* Bracket rounds */}
      {rounds.map((round) => {
        const resolved = round.entries.filter(
          (e) => actuals[e.slot1] || actuals[e.slot2] || actuals[e.winnerSlot]
        );
        const finished = round.entries.filter((e) => actuals[e.winnerSlot]);

        return (
          <section key={round.label}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest">
                {round.label}
              </h2>
              <span className="text-[#6b7280] text-xs">
                {finished.length}/{round.entries.length} disputados
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {round.entries.map((entry) => (
                <MatchCard key={entry.winnerSlot} entry={entry} actuals={actuals} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
