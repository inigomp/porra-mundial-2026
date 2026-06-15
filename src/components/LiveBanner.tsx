import { getLiveWCMatches, getRecentWCMatches } from "@/lib/football-data-org";
import type { FdoMatchSummary } from "@/lib/football-data-org";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { applyOverrides } from "@/lib/score-overrides";
import { cookies } from "next/headers";
import { teamsMatch } from "@/lib/live-scores";

const FLAG: Record<string, string> = {
  "Brazil": "🇧🇷", "France": "🇫🇷", "Argentina": "🇦🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Spain": "🇪🇸", "Germany": "🇩🇪", "Portugal": "🇵🇹", "Netherlands": "🇳🇱",
  "Morocco": "🇲🇦", "Japan": "🇯🇵", "USA": "🇺🇸", "Mexico": "🇲🇽",
  "Australia": "🇦🇺", "Switzerland": "🇨🇭", "Turkey": "🇹🇷", "Ecuador": "🇪🇨",
  "Senegal": "🇸🇳", "Croatia": "🇭🇷", "Uruguay": "🇺🇾", "Colombia": "🇨🇴",
  "Canada": "🇨🇦", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "South Korea": "🇰🇷", "Czechia": "🇨🇿", "South Africa": "🇿🇦", "Haiti": "🇭🇹",
  "Paraguay": "🇵🇾", "Ivory Coast": "🇨🇮", "Qatar": "🇶🇦", "Bosnia and Herzegovina": "🇧🇦",
  "Curaçao": "🇨🇼", "United States": "🇺🇸", "Korea Republic": "🇰🇷",
  "Bosnia-Herzegovina": "🇧🇦", "Chequia": "🇨🇿", "Países Bajos": "🇳🇱",
};

// Team name → flag lookup for static MATCHES (Spanish names)
const FLAG_ES: Record<string, string> = {
  "Brasil": "🇧🇷", "Francia": "🇫🇷", "Argentina": "🇦🇷", "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "España": "🇪🇸", "Alemania": "🇩🇪", "Portugal": "🇵🇹", "Países Bajos": "🇳🇱",
  "Marruecos": "🇲🇦", "Japón": "🇯🇵", "Estados Unidos": "🇺🇸", "México": "🇲🇽",
  "Australia": "🇦🇺", "Suiza": "🇨🇭", "Turquía": "🇹🇷", "Ecuador": "🇪🇨",
  "Senegal": "🇸🇳", "Croacia": "🇭🇷", "Uruguay": "🇺🇾", "Colombia": "🇨🇴",
  "Canadá": "🇨🇦", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Suecia": "🇸🇪", "Túnez": "🇹🇳",
  "Corea del Sur": "🇰🇷", "Chequia": "🇨🇿", "Sudáfrica": "🇿🇦", "Haití": "🇭🇹",
  "Paraguay": "🇵🇾", "Costa de Marfil": "🇨🇮", "Catar": "🇶🇦",
  "Bosnia y Herzegovina": "🇧🇦", "Curazao": "🇨🇼",
};

function statusLabel(m: FdoMatchSummary): string {
  if (m.status === "PAUSED") return "HT";
  if (m.status === "IN_PLAY") return m.minute ? `${m.minute}'` : "EN JUEGO";
  if (m.status === "FINISHED") return "FT";
  return m.status;
}

export default async function LiveBanner() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("porra_identity")?.value;
  const me = identityId ? PARTICIPANTS.find((p) => p.id === identityId) : null;

  /** Find my prediction for a match by team name (EN API names → ES static names) */
  function myPred(homeTeamApi: string, awayTeamApi: string) {
    if (!me) return null;
    const staticMatch = applyOverrides(MATCHES).find((m) =>
      teamsMatch(homeTeamApi, m.homeTeam) && teamsMatch(awayTeamApi, m.awayTeam)
    );
    if (!staticMatch) return null;
    return me.predictions[staticMatch.id] ?? null;
  }

  // 1. Try API live matches
  let matches = await getLiveWCMatches();
  let isLive = matches.length > 0;

  // 2. Fall back to recent finished/in-play (last 2 days to handle UTC midnight boundary)
  if (!isLive) {
    const recent = await getRecentWCMatches(2);
    matches = recent.filter(
      (m) => m.status === "IN_PLAY" || m.status === "PAUSED" || m.status === "FINISHED"
    );
    // Sort by utcDate descending so matches[0] is the most recent
    matches.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
    isLive = matches.some((m) => m.status === "IN_PLAY" || m.status === "PAUSED");
  }

  // 3. Fall back to last played match from static + synced data
  if (matches.length === 0) {
    const allMatches = applyOverrides(MATCHES).filter(
      (m) =>
        m.homeScore !== null &&
        !m.homeTeam.toUpperCase().includes("OCTAVO") &&
        !m.homeTeam.toUpperCase().includes("ACERTAR")
    );
    if (allMatches.length === 0) return null;

    // Sort by numeric ID descending — IDs are sequential (m1, m2 ... m73)
    const sorted = [...allMatches].sort(
      (a, b) => parseInt(b.id.replace(/\D/g, "")) - parseInt(a.id.replace(/\D/g, ""))
    );
    const lastMatch = sorted[0];
    const homeFlag = FLAG_ES[lastMatch.homeTeam] ?? "🏳️";
    const awayFlag = FLAG_ES[lastMatch.awayTeam] ?? "🏳️";

    return (
      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <span className="bg-[#2a2d3a] text-[#6b7280] text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
          ÚLTIMO RESULTADO
        </span>
        <div className="flex flex-col items-center flex-1 min-w-[200px] gap-1">
          <div className="flex items-center gap-3 justify-center">
            <span className="text-2xl">{homeFlag}</span>
            <span className="text-[#9ca3af] text-sm font-medium hidden sm:inline">{lastMatch.homeTeam}</span>
            <span className="text-white font-black text-2xl tabular-nums">
              {lastMatch.homeScore} – {lastMatch.awayScore}
            </span>
            <span className="text-[#9ca3af] text-sm font-medium hidden sm:inline">{lastMatch.awayTeam}</span>
            <span className="text-2xl">{awayFlag}</span>
          </div>
          {(() => { const p = myPred(lastMatch.homeTeam, lastMatch.awayTeam); return p ? (
            <p className="text-[#6b7280] text-xs">mi pred: <span className="text-[#9ca3af] font-semibold tabular-nums">{p.homeGoals} – {p.awayGoals}</span></p>
          ) : null; })()}
        </div>
        <span className="text-[#6b7280] text-xs shrink-0">FT</span>
      </div>
    );
  }

  const match = matches[0];
  const homeScore = match.score.fullTime.home ?? 0;
  const awayScore = match.score.fullTime.away ?? 0;
  const homeFlag = FLAG[match.homeTeam.name] ?? "🏳️";
  const awayFlag = FLAG[match.awayTeam.name] ?? "🏳️";
  const label = statusLabel(match);
  const matchIsLive = match.status === "IN_PLAY" || match.status === "PAUSED";

  // Count participants whose GK plays for one of the teams
  const homeTeamName = match.homeTeam.name.toLowerCase();
  const awayTeamName = match.awayTeam.name.toLowerCase();
  const gkCount = PARTICIPANTS.filter((p) => {
    const gk = p.goalkeeper.toLowerCase();
    return gk.includes(homeTeamName.split(" ")[0]) || gk.includes(awayTeamName.split(" ")[0]);
  }).length;

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
      {/* Live badge (mobile) */}
      {matchIsLive && (
        <span className="sm:hidden inline-flex items-center gap-1 bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full self-start">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          EN VIVO
        </span>
      )}

      {/* Score */}
      <div className="flex items-center gap-6 flex-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{homeFlag}</span>
          <div className="text-center">
            <p className="text-xs font-bold text-[#9ca3af] tracking-wider">{match.homeTeam.shortName ?? match.homeTeam.name}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-3xl font-black text-white tracking-tight">
            {homeScore} – {awayScore}
          </p>
          <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mt-1 ${
            isLive
              ? "bg-red-500/20 text-red-400"
              : "bg-[#2a2d3a] text-[#9ca3af]"
          }`}>
            {matchIsLive ? `${label} MIN` : label}
          </span>
          {(() => { const p = myPred(match.homeTeam.name, match.awayTeam.name); return p ? (
            <p className="text-[#6b7280] text-xs mt-1">mi pred: <span className="text-[#9ca3af] font-semibold tabular-nums">{p.homeGoals} – {p.awayGoals}</span></p>
          ) : null; })()}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-xs font-bold text-[#9ca3af] tracking-wider">{match.awayTeam.shortName ?? match.awayTeam.name}</p>
          </div>
          <span className="text-3xl">{awayFlag}</span>
        </div>
      </div>

      {/* GK count + extra live matches */}
      <div className="flex flex-col gap-1 text-xs text-[#6b7280] text-center min-w-[120px]">
        {gkCount > 0 && (
          <p className="text-[#9ca3af]">
            🧤 <span className="text-white font-bold">{gkCount}</span> portero{gkCount !== 1 ? "s" : ""} en juego
          </p>
        )}
      </div>

      {/* Live indicator (desktop) */}
      {matchIsLive && (
        <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-red-400 text-xs font-bold tracking-widest">EN VIVO</span>
        </div>
      )}
    </div>
  );
}

