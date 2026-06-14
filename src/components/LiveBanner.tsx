import { getLiveWCMatches, getTodayWCMatches } from "@/lib/football-data-org";
import type { FdoMatchSummary } from "@/lib/football-data-org";
import { PARTICIPANTS } from "@/lib/participants";
import { TrendingUp } from "lucide-react";

const FLAG: Record<string, string> = {
  "Brazil": "🇧🇷", "France": "🇫🇷", "Argentina": "🇦🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Spain": "🇪🇸", "Germany": "🇩🇪", "Portugal": "🇵🇹", "Netherlands": "🇳🇱",
  "Morocco": "🇲🇦", "Japan": "🇯🇵", "USA": "🇺🇸", "Mexico": "🇲🇽",
  "Australia": "🇦🇺", "Switzerland": "🇨🇭", "Turkey": "🇹🇷", "Ecuador": "🇪🇨",
  "Senegal": "🇸🇳", "Croatia": "🇭🇷", "Uruguay": "🇺🇾", "Colombia": "🇨🇴",
  "Canada": "🇨🇦", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "South Korea": "🇰🇷", "Czechia": "🇨🇿", "South Africa": "🇿🇦", "Haiti": "🇭🇹",
  "Paraguay": "🇵🇾", "Ivory Coast": "🇨🇮", "Qatar": "🇶🇦", "Bosnia and Herzegovina": "🇧🇦",
  "Curaçao": "🇨🇼",
  "Morocco": "🇲🇦",
  "United States": "🇺🇸",
  "Korea Republic": "🇰🇷",
  "Bosnia-Herzegovina": "🇧🇦",
};

function statusLabel(m: FdoMatchSummary): string {
  if (m.status === "PAUSED") return "HT";
  if (m.status === "IN_PLAY") return m.minute ? `${m.minute}'` : "EN JUEGO";
  if (m.status === "FINISHED") return "FT";
  return m.status;
}

export default async function LiveBanner() {
  // Try live first, fall back to today's in-progress / recently finished
  let matches = await getLiveWCMatches();
  if (matches.length === 0) {
    const today = await getTodayWCMatches();
    matches = today.filter(
      (m) => m.status === "IN_PLAY" || m.status === "PAUSED" || m.status === "FINISHED"
    );
  }

  if (matches.length === 0) return null;

  // Count live porter picks to show as context
  const liveIds = new Set(matches.map((m) => m.id));
  const _ = liveIds; // used below if needed

  const match = matches[0];
  const homeScore = match.score.fullTime.home ?? 0;
  const awayScore = match.score.fullTime.away ?? 0;
  const homeFlag = FLAG[match.homeTeam.name] ?? "🏳️";
  const awayFlag = FLAG[match.awayTeam.name] ?? "🏳️";
  const label = statusLabel(match);
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";

  // Count participants whose GK plays for one of the teams
  const homeTeamName = match.homeTeam.name.toLowerCase();
  const awayTeamName = match.awayTeam.name.toLowerCase();
  const gkCount = PARTICIPANTS.filter((p) => {
    const gk = p.goalkeeper.toLowerCase();
    return gk.includes(homeTeamName.split(" ")[0]) || gk.includes(awayTeamName.split(" ")[0]);
  }).length;

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
      {/* Live badge */}
      {isLive && (
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
            {isLive ? `${label} MIN` : label}
          </span>
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
        {matches.length > 1 && (
          <p>+{matches.length - 1} partido{matches.length > 2 ? "s" : ""} más</p>
        )}
      </div>

      {/* Live indicator (desktop) */}
      {isLive && (
        <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-red-400 text-xs font-bold tracking-widest">EN VIVO</span>
        </div>
      )}
    </div>
  );
}

