import { getLiveWCMatches, getRecentWCMatches } from "@/lib/football-data-org";
import type { FdoMatchSummary } from "@/lib/football-data-org";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { teamsMatch, getMatchesWithLiveScores } from "@/lib/live-scores";
import {
  buildLeaderboard,
  calculateParticipantScore,
  simulateLiveScenario,
} from "@/lib/scoring-engine";
import type { Fixture } from "@/lib/types";
import { cookies } from "next/headers";

// ─── Team code mappings ───────────────────────────────────────────────────────

const FDO_TO_CODE: Record<string, string> = {
  "brazil": "BRA", "morocco": "MAR", "france": "FRA", "spain": "ESP",
  "germany": "GER", "argentina": "ARG", "portugal": "POR", "netherlands": "NED",
  "england": "ENG", "japan": "JPN", "mexico": "MEX", "australia": "AUS",
  "switzerland": "SUI", "turkey": "TUR", "ecuador": "ECU", "canada": "CAN",
  "scotland": "SCO", "sweden": "SWE", "tunisia": "TUN",
  "south korea": "KOR", "korea republic": "KOR",
  "czechia": "CZE", "czech republic": "CZE",
  "south africa": "RSA", "haiti": "HAI",
  "united states": "USA", "usa": "USA",
  "ivory coast": "CIV", "cote d'ivoire": "CIV",
  "qatar": "QAT", "bosnia and herzegovina": "BIH", "bosnia-herzegovina": "BIH",
  "curacao": "CUW", "paraguay": "PAR", "belgium": "BEL",
  "egypt": "EGY", "iran": "IRN", "new zealand": "NZL",
  "saudi arabia": "KSA", "uruguay": "URU", "cape verde": "CPV",
  "senegal": "SEN", "iraq": "IRQ", "norway": "NOR",
  "algeria": "ALG", "austria": "AUT", "jordan": "JOR",
  "congo dr": "COD", "dr congo": "COD", "uzbekistan": "UZB", "colombia": "COL",
  "croatia": "CRO", "ghana": "GHA", "panama": "PAN",
};

const ES_TO_CODE: Record<string, string> = {
  "Brasil": "BRA", "Marruecos": "MAR", "Francia": "FRA", "España": "ESP",
  "Alemania": "GER", "Argentina": "ARG", "Portugal": "POR", "Países Bajos": "NED",
  "Inglaterra": "ENG", "Japón": "JPN", "México": "MEX", "Australia": "AUS",
  "Suiza": "SUI", "Turquía": "TUR", "Ecuador": "ECU", "Canadá": "CAN",
  "Escocia": "SCO", "Suecia": "SWE", "Túnez": "TUN", "Corea del Sur": "KOR",
  "Chequia": "CZE", "Sudáfrica": "RSA", "Haití": "HAI", "Estados Unidos": "USA",
  "Costa de Marfil": "CIV", "Catar": "QAT", "Bosnia y Herzegovina": "BIH",
  "Curazao": "CUW", "Paraguay": "PAR", "Bélgica": "BEL", "Egipto": "EGY",
  "Irán": "IRN", "Nueva Zelanda": "NZL", "Arabia Saudita": "KSA",
  "Uruguay": "URU", "Cabo Verde": "CPV", "Senegal": "SEN", "Irak": "IRQ",
  "Noruega": "NOR", "Argelia": "ALG", "Austria": "AUT", "Jordania": "JOR",
  "RD Congo": "COD", "Uzbekistán": "UZB", "Colombia": "COL",
  "Croacia": "CRO", "Ghana": "GHA", "Panamá": "PAN",
};

const FLAG: Record<string, string> = {
  "Brazil": "🇧🇷", "Morocco": "🇲🇦", "France": "🇫🇷", "Spain": "🇪🇸",
  "Germany": "🇩🇪", "Argentina": "🇦🇷", "Portugal": "🇵🇹", "Netherlands": "🇳🇱",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Japan": "🇯🇵", "Mexico": "🇲🇽", "Australia": "🇦🇺",
  "Switzerland": "🇨🇭", "Turkey": "🇹🇷", "Ecuador": "🇪🇨", "Canada": "🇨🇦",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "South Korea": "🇰🇷", "Korea Republic": "🇰🇷", "Czechia": "🇨🇿",
  "South Africa": "🇿🇦", "Haiti": "🇭🇹", "United States": "🇺🇸", "USA": "🇺🇸",
  "Ivory Coast": "🇨🇮", "Qatar": "🇶🇦", "Bosnia and Herzegovina": "🇧🇦",
  "Curaçao": "🇨🇼", "Curacao": "🇨🇼", "Paraguay": "🇵🇾", "Belgium": "🇧🇪",
  "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿", "Saudi Arabia": "🇸🇦",
  "Uruguay": "🇺🇾", "Cape Verde": "🇨🇻", "Senegal": "🇸🇳", "Iraq": "🇮🇶",
  "Norway": "🇳🇴", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
  "Congo DR": "🇨🇩", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
  "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦",
};

const FLAG_ES: Record<string, string> = {
  "Brasil": "🇧🇷", "Marruecos": "🇲🇦", "Francia": "🇫🇷", "España": "🇪🇸",
  "Alemania": "🇩🇪", "Argentina": "🇦🇷", "Portugal": "🇵🇹", "Países Bajos": "🇳🇱",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Japón": "🇯🇵", "México": "🇲🇽", "Australia": "🇦🇺",
  "Suiza": "🇨🇭", "Turquía": "🇹🇷", "Ecuador": "🇪🇨", "Canadá": "🇨🇦",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Suecia": "🇸🇪", "Túnez": "🇹🇳", "Corea del Sur": "🇰🇷",
  "Chequia": "🇨🇿", "Sudáfrica": "🇿🇦", "Haití": "🇭🇹", "Estados Unidos": "🇺🇸",
  "Costa de Marfil": "🇨🇮", "Catar": "🇶🇦", "Bosnia y Herzegovina": "🇧🇦",
  "Curazao": "🇨🇼", "Paraguay": "🇵🇾", "Bélgica": "🇧🇪", "Egipto": "🇪🇬",
  "Irán": "🇮🇷", "Nueva Zelanda": "🇳🇿", "Arabia Saudita": "🇸🇦", "Uruguay": "🇺🇾",
  "Cabo Verde": "🇨🇻", "Senegal": "🇸🇳", "Irak": "🇮🇶", "Noruega": "🇳🇴",
  "Argelia": "🇩🇿", "Austria": "🇦🇹", "Jordania": "🇯🇴", "RD Congo": "🇨🇩",
  "Uzbekistán": "🇺🇿", "Colombia": "🇨🇴", "Croacia": "🇭🇷", "Ghana": "🇬🇭", "Panamá": "🇵🇦",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normKey(s: string): string {
  return s.toLowerCase()
    .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i").replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u").replace(/ñ/g, "n").replace(/ç/g, "c");
}

function getCodeFromFdo(name: string): string | null {
  return FDO_TO_CODE[normKey(name)] ?? null;
}

function extractCode(s: string): string | null {
  const m = s.match(/\(([A-Z]{2,3})\)\s*$/);
  return m ? m[1] : null;
}

function stripCode(s: string): string {
  return s.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

function statusLabel(m: FdoMatchSummary): string {
  if (m.status === "PAUSED") return "DESCANSO";
  if (m.status === "IN_PLAY") return m.minute ? `${m.minute}'` : "EN JUEGO";
  if (m.status === "FINISHED") return "FT";
  return m.status;
}

function gkPtsLabel(goals: number): { text: string; green: boolean } {
  if (goals === 0) return { text: "portería a 0 → +3 pts", green: true };
  if (goals === 1) return { text: "1 gol encajado → 0 pts", green: false };
  if (goals === 2) return { text: "2 goles encajados → -1 pt", green: false };
  return { text: `${goals} goles encajados → -${goals - 1} pts`, green: false };
}

/** Most common GK entry (by participant count) for a given team code */
function getGkNameForCode(code: string): string | null {
  const counts = new Map<string, number>();
  for (const p of PARTICIPANTS) {
    const c = extractCode(p.goalkeeper);
    if (c === code) counts.set(p.goalkeeper, (counts.get(p.goalkeeper) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

/** All killerMundial choices for a given team code, grouped by player name */
function getKillersForCode(code: string): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of PARTICIPANTS) {
    const c = extractCode(p.killerMundial);
    if (c === code) counts.set(p.killerMundial, (counts.get(p.killerMundial) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DirectoPage() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("porra_identity")?.value;
  const me = identityId ? PARTICIPANTS.find((p) => p.id === identityId) : null;

  // 1. Fetch FDO live/recent data (same pattern as LiveBanner)
  let fdoMatches = await getLiveWCMatches();
  let hasLive = fdoMatches.length > 0;
  if (!hasLive) {
    const recent = await getRecentWCMatches(2);
    fdoMatches = recent
      .filter((m) => ["IN_PLAY", "PAUSED", "FINISHED"].includes(m.status))
      .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
    hasLive = fdoMatches.some((m) => m.status === "IN_PLAY" || m.status === "PAUSED");
  }
  // Live matches first, then most recent finished
  fdoMatches.sort((a, b) => {
    const aLive = a.status === "IN_PLAY" || a.status === "PAUSED" ? 0 : 1;
    const bLive = b.status === "IN_PLAY" || b.status === "PAUSED" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime();
  });

  const fdoFocus = fdoMatches[0] ?? null;

  // 2. All matches with current scores (for standings computation)
  const allMatchesWithScores = await getMatchesWithLiveScores();

  // 3. Find the static match corresponding to fdoFocus
  const staticFocus = fdoFocus
    ? MATCHES.find(
        (m) =>
          teamsMatch(fdoFocus.homeTeam.name, m.homeTeam) &&
          teamsMatch(fdoFocus.awayTeam.name, m.awayTeam)
      ) ?? null
    : null;

  // 4. Fallback: next upcoming match from static data
  const upcomingStatic = !fdoFocus
    ? MATCHES.filter(
        (m) =>
          m.homeScore === null &&
          !m.homeTeam.toUpperCase().includes("OCTAVO") &&
          !m.homeTeam.toUpperCase().includes("ACERTAR")
      ).sort(
        (a, b) =>
          parseInt(a.id.replace(/\D/g, "")) - parseInt(b.id.replace(/\D/g, ""))
      )[0] ?? null
    : null;

  // 5. Focus match identifiers
  const focusId = staticFocus?.id ?? upcomingStatic?.id ?? null;
  const focusHomeDisplay =
    upcomingStatic?.homeTeam ?? fdoFocus?.homeTeam.shortName ?? fdoFocus?.homeTeam.name ?? "";
  const focusAwayDisplay =
    upcomingStatic?.awayTeam ?? fdoFocus?.awayTeam.shortName ?? fdoFocus?.awayTeam.name ?? "";
  const focusHomeFlag = fdoFocus
    ? (FLAG[fdoFocus.homeTeam.name] ?? "🏳️")
    : upcomingStatic
    ? (FLAG_ES[upcomingStatic.homeTeam] ?? "🏳️")
    : "🏳️";
  const focusAwayFlag = fdoFocus
    ? (FLAG[fdoFocus.awayTeam.name] ?? "🏳️")
    : upcomingStatic
    ? (FLAG_ES[upcomingStatic.awayTeam] ?? "🏳️")
    : "🏳️";

  const isFocusLive =
    fdoFocus && (fdoFocus.status === "IN_PLAY" || fdoFocus.status === "PAUSED");
  const focusScore = fdoFocus
    ? {
        h: fdoFocus.score.fullTime.home ?? 0,
        a: fdoFocus.score.fullTime.away ?? 0,
      }
    : null;
  const myPred = me && focusId ? (me.predictions[focusId] ?? null) : null;

  // 6. Team codes → participation stats
  const homeCode = fdoFocus
    ? getCodeFromFdo(fdoFocus.homeTeam.name)
    : upcomingStatic
    ? (ES_TO_CODE[upcomingStatic.homeTeam] ?? null)
    : null;
  const awayCode = fdoFocus
    ? getCodeFromFdo(fdoFocus.awayTeam.name)
    : upcomingStatic
    ? (ES_TO_CODE[upcomingStatic.awayTeam] ?? null)
    : null;

  const gkHomeCount = homeCode
    ? PARTICIPANTS.filter((p) => extractCode(p.goalkeeper) === homeCode).length
    : 0;
  const gkAwayCount = awayCode
    ? PARTICIPANTS.filter((p) => extractCode(p.goalkeeper) === awayCode).length
    : 0;
  const gkHomeName = homeCode ? getGkNameForCode(homeCode) : null;
  const gkAwayName = awayCode ? getGkNameForCode(awayCode) : null;
  const killersHome = homeCode ? getKillersForCode(homeCode) : [];
  const killersAway = awayCode ? getKillersForCode(awayCode) : [];

  // Prediction distribution for the focus match
  const focusPreds = focusId
    ? PARTICIPANTS.map((p) => p.predictions[focusId]).filter(Boolean)
    : [];
  const predHomeWins = focusPreds.filter((p) => p.homeGoals > p.awayGoals).length;
  const predDraws = focusPreds.filter((p) => p.homeGoals === p.awayGoals).length;
  const predAwayWins = focusPreds.filter((p) => p.homeGoals < p.awayGoals).length;

  // 7. Base standings — all finished matches EXCLUDING the focus match
  const baseFixtures: Fixture[] = allMatchesWithScores
    .filter(
      (m) =>
        m.homeScore !== null &&
        m.id !== focusId &&
        !m.homeTeam.toUpperCase().includes("OCTAVO") &&
        !m.homeTeam.toUpperCase().includes("ACERTAR")
    )
    .map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: "FT" as const,
      homeFlag: "",
      awayFlag: "",
      date: m.id, // used only for lastFive ordering in buildLeaderboard
      homePenalties: null,
      awayPenalties: null,
      minute: null,
      phase: "groups" as const,
    }));

  const baseBreakdowns = PARTICIPANTS.map((p) =>
    calculateParticipantScore({
      participant: p,
      fixtures: baseFixtures,
      goalkeeperData: [],
      killerGoals: { mundialGoals: 0, seleccionGoals: 0 },
    })
  );
  const baseStandings = buildLeaderboard(baseBreakdowns, baseFixtures);
  const top10Ids = new Set(baseStandings.slice(0, 10).map((e) => e.participantId));

  // 8. Scenario simulations (prediction-only — GK/killer shown separately)
  type ScenarioResult = {
    label: string;
    h: number;
    a: number;
    gkHomeGoals: number;
    gkAwayGoals: number;
    correctPredCount: number;
    newTop5: Array<{
      participantId: string;
      participantName: string;
      projectedRank: number;
      projectedPoints: number;
      pointsDelta: number;
      baseRank: number;
    }>;
  };

  // Three scenarios anchored to the current live score:
  //   1. Stays as-is (current score)
  //   2. Home scores next (+1 local)
  //   3. Away scores next (+1 visitante)
  // If match hasn't started yet (no score), use 0-0 / 1-0 / 0-1 as seeds.
  const curH = focusScore?.h ?? 0;
  const curA = focusScore?.a ?? 0;
  const matchStarted = focusScore !== null;

  const scenariosData: ScenarioResult[] = focusId
    ? [
        {
          label: matchStarted ? "Se mantiene así" : "Empate",
          h: curH,
          a: curA,
          gkHomeGoals: curA,
          gkAwayGoals: curH,
        },
        {
          label: matchStarted ? `Marca ${focusHomeDisplay}` : `Gana ${focusHomeDisplay}`,
          h: curH + 1,
          a: curA,
          gkHomeGoals: curA,
          gkAwayGoals: curH + 1,
        },
        {
          label: matchStarted ? `Marca ${focusAwayDisplay}` : `Gana ${focusAwayDisplay}`,
          h: curH,
          a: curA + 1,
          gkHomeGoals: curA + 1,
          gkAwayGoals: curH,
        },
      ].map((s) => {
        const sim = simulateLiveScenario(
          { homeScore: s.h, awayScore: s.a, description: s.label },
          focusId,
          baseBreakdowns,
          PARTICIPANTS
        );
        const newTop5 = sim.standings.slice(0, 8).map((e) => ({
          ...e,
          baseRank:
            baseStandings.find((b) => b.participantId === e.participantId)
              ?.rank ?? 99,
        }));
        const correctPredCount = sim.standings.filter(
          (e) => e.pointsDelta > 0
        ).length;
        return { ...s, newTop5, correctPredCount };
      })
    : [];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white font-bold text-xl">En vivo</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Seguimiento en tiempo real e impacto en la clasificación
        </p>
      </div>

      {/* ── Current match card (ALWAYS at top) ── */}
      {fdoFocus ? (
        <div
          className={`border rounded-xl p-5 ${
            isFocusLive
              ? "bg-[#1a1d26] border-red-500/30"
              : "bg-[#1a1d26] border-[#2a2d3a]"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            {isFocusLive ? (
              <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                EN VIVO
              </span>
            ) : (
              <span className="bg-[#2a2d3a] text-[#9ca3af] text-xs font-bold px-2.5 py-1 rounded-full">
                {statusLabel(fdoFocus)}
              </span>
            )}
            {isFocusLive && fdoFocus.minute && (
              <span className="text-red-400 text-sm font-bold">
                {fdoFocus.minute}&apos;
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl">{focusHomeFlag}</span>
              <span className="text-[#9ca3af] text-sm font-medium">
                {focusHomeDisplay}
              </span>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-white tabular-nums">
                {focusScore
                  ? `${focusScore.h} – ${focusScore.a}`
                  : "– –"}
              </p>
              {myPred && (
                <p className="text-[#6b7280] text-xs mt-1">
                  mi pred:{" "}
                  <span className="text-[#9ca3af] font-semibold tabular-nums">
                    {myPred.homeGoals} – {myPred.awayGoals}
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl">{focusAwayFlag}</span>
              <span className="text-[#9ca3af] text-sm font-medium">
                {focusAwayDisplay}
              </span>
            </div>
          </div>
          {fdoMatches.length > 1 && (
            <p className="text-center text-[#6b7280] text-xs mt-3">
              +{fdoMatches.length - 1} partido
              {fdoMatches.length > 2 ? "s" : ""} más en juego
            </p>
          )}
        </div>
      ) : upcomingStatic ? (
        <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-[#2a2d3a] text-[#9ca3af] text-xs font-bold px-2.5 py-1 rounded-full">
              PRÓXIMO
            </span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl">{focusHomeFlag}</span>
              <span className="text-[#9ca3af] text-sm font-medium">
                {focusHomeDisplay}
              </span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#6b7280]">vs</p>
              {myPred && (
                <p className="text-[#6b7280] text-xs mt-1">
                  mi pred:{" "}
                  <span className="text-[#9ca3af] font-semibold tabular-nums">
                    {myPred.homeGoals} – {myPred.awayGoals}
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl">{focusAwayFlag}</span>
              <span className="text-[#9ca3af] text-sm font-medium">
                {focusAwayDisplay}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📡</div>
          <h2 className="text-white font-semibold text-base mb-1">
            Sin partidos próximos
          </h2>
          <p className="text-[#6b7280] text-sm">
            No hay partidos programados en este momento.
          </p>
        </div>
      )}

      {/* ── Match insights ── */}
      {focusId && (
        <>
          {/* Participation stats */}
          <section>
            <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest mb-3">
              En juego
            </h2>

            {/* GK cards */}
            {(gkHomeName || gkAwayName) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {gkHomeName && (
                  <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🧤</span>
                      <span className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide">
                        Portero local
                      </span>
                    </div>
                    <p className="text-white font-bold text-sm truncate">
                      {stripCode(gkHomeName)}
                    </p>
                    <p className="text-[#00c853] font-black text-2xl mt-1">
                      {gkHomeCount}
                    </p>
                    <p className="text-[#6b7280] text-xs">
                      participante{gkHomeCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {gkAwayName && (
                  <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🧤</span>
                      <span className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide">
                        Portero visitante
                      </span>
                    </div>
                    <p className="text-white font-bold text-sm truncate">
                      {stripCode(gkAwayName)}
                    </p>
                    <p className="text-[#00c853] font-black text-2xl mt-1">
                      {gkAwayCount}
                    </p>
                    <p className="text-[#6b7280] text-xs">
                      participante{gkAwayCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Killer mundial choices */}
            {(killersHome.length > 0 || killersAway.length > 0) && (
              <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">⚡</span>
                  <span className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide">
                    Killers del mundial en juego
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...killersHome, ...killersAway].map((k) => (
                    <div
                      key={k.name}
                      className="bg-[#2a2d3a] rounded-lg px-3 py-1.5 flex items-center gap-2"
                    >
                      <span className="text-white text-sm font-medium">
                        {stripCode(k.name)}
                      </span>
                      <span className="text-[#00c853] font-bold text-sm">
                        {k.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction distribution */}
            {focusPreds.length > 0 && (
              <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🗳️</span>
                  <span className="text-[#9ca3af] text-xs font-semibold uppercase tracking-wide">
                    ¿Qué predicen los {focusPreds.length}?
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 text-center bg-[#2a2d3a] rounded-lg py-2">
                    <p className="text-white font-black text-xl">{predHomeWins}</p>
                    <p className="text-[#6b7280] text-xs mt-0.5">gana local</p>
                  </div>
                  <div className="flex-1 text-center bg-[#2a2d3a] rounded-lg py-2">
                    <p className="text-white font-black text-xl">{predDraws}</p>
                    <p className="text-[#6b7280] text-xs mt-0.5">empate</p>
                  </div>
                  <div className="flex-1 text-center bg-[#2a2d3a] rounded-lg py-2">
                    <p className="text-white font-black text-xl">{predAwayWins}</p>
                    <p className="text-[#6b7280] text-xs mt-0.5">gana visitante</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Classification impact */}
          {scenariosData.length > 0 && (
            <section>
              <h2 className="text-[#9ca3af] text-xs font-semibold uppercase tracking-widest mb-3">
                Impacto en la clasificación
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenariosData.map((s) => (
                  <div
                    key={s.label}
                    className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4"
                  >
                    {/* Scenario header */}
                    <div className="mb-3">
                      <p className="text-white font-bold text-sm truncate">
                        {s.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[#9ca3af] text-xs font-mono font-bold">
                          {s.h}–{s.a}
                        </span>
                        <span className="text-[#2a2d3a]">·</span>
                        <span className="text-[#6b7280] text-xs">
                          {s.correctPredCount} aciertan
                        </span>
                      </div>
                    </div>

                    {/* GK impact */}
                    {(gkHomeCount > 0 || gkAwayCount > 0) && (
                      <div className="mb-3 space-y-1">
                        {gkHomeCount > 0 && gkHomeName && (() => {
                          const { text, green } = gkPtsLabel(s.gkHomeGoals);
                          return (
                            <div className="flex justify-between items-center text-xs gap-1">
                              <span className="text-[#6b7280] truncate">
                                🧤 {stripCode(gkHomeName)}
                              </span>
                              <span
                                className={`shrink-0 font-semibold ${green ? "text-[#00c853]" : "text-[#6b7280]"}`}
                              >
                                {text}
                              </span>
                            </div>
                          );
                        })()}
                        {gkAwayCount > 0 && gkAwayName && (() => {
                          const { text, green } = gkPtsLabel(s.gkAwayGoals);
                          return (
                            <div className="flex justify-between items-center text-xs gap-1">
                              <span className="text-[#6b7280] truncate">
                                🧤 {stripCode(gkAwayName)}
                              </span>
                              <span
                                className={`shrink-0 font-semibold ${green ? "text-[#00c853]" : "text-[#6b7280]"}`}
                              >
                                {text}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-[#2a2d3a] mb-3" />

                    {/* New top 8 */}
                    <div className="space-y-2">
                      {s.newTop5.map((e) => {
                        const rankDelta = e.baseRank - e.projectedRank;
                        return (
                          <div
                            key={e.participantId}
                            className="flex items-center gap-2"
                          >
                            <span className="text-[#6b7280] text-xs w-5 text-right font-mono shrink-0">
                              {e.projectedRank}
                            </span>
                            <span
                              className={`text-xs flex-1 truncate ${
                                top10Ids.has(e.participantId)
                                  ? "text-white font-medium"
                                  : "text-[#9ca3af]"
                              }`}
                            >
                              {e.participantName.split(" ").slice(0, 2).join(" ")}
                            </span>
                            {e.pointsDelta > 0 && (
                              <span className="text-[#00c853] text-xs font-bold shrink-0">
                                +{e.pointsDelta}
                              </span>
                            )}
                            {rankDelta > 0 && (
                              <span className="text-[#00c853] text-xs shrink-0">
                                ↑{rankDelta}
                              </span>
                            )}
                            {rankDelta < 0 && (
                              <span className="text-red-400 text-xs shrink-0">
                                ↓{Math.abs(rankDelta)}
                              </span>
                            )}
                            {rankDelta === 0 && e.pointsDelta > 0 && (
                              <span className="text-[#6b7280] text-xs shrink-0">
                                —
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[#6b7280] text-xs mt-2">
                Marcadores calculados desde el resultado actual (ningún equipo puede retroceder en el marcador).
                Solo incluyen puntos de predicción; portería y killer se muestran arriba.
              </p>
            </section>
          )}
        </>
      )}

      {/* Sync info */}
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 flex items-start gap-3">
        <span className="text-[#00c853] text-lg mt-0.5">ℹ️</span>
        <div>
          <p className="text-white text-sm font-medium">
            Cómo funciona la sincronización
          </p>
          <p className="text-[#6b7280] text-xs mt-1 leading-relaxed">
            Un cron job llama a{" "}
            <code className="text-[#9ca3af] bg-[#2a2d3a] px-1 rounded">
              /api/cron/sync-scores
            </code>{" "}
            cada 5 minutos entre las 10:00 y las 23:00 UTC. Los datos vienen de
            football-data.org.
          </p>
        </div>
      </div>
    </main>
  );
}
