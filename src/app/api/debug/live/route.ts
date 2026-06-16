import { NextResponse } from "next/server";
import { getLiveWCMatches, getTodayWCMatches, getRecentWCMatches, getAllFinishedWCMatches } from "@/lib/football-data-org";
import { getMatchesWithLiveScores } from "@/lib/live-scores";

export async function GET() {
  const [live, today, recent, finished, merged] = await Promise.all([
    getLiveWCMatches(),
    getTodayWCMatches(),
    getRecentWCMatches(2),
    getAllFinishedWCMatches(),
    getMatchesWithLiveScores(),
  ]);

  const fmt = (arr: typeof live) => arr.map((m) => ({
    id: m.id, home: m.homeTeam.name, away: m.awayTeam.name,
    status: m.status, fullTime: m.score.fullTime, halfTime: m.score.halfTime,
  }));

  // Show only still-null matches in merged result
  const stillPending = merged
    .filter((m) => m.homeScore === null)
    .map((m) => ({ id: m.id, home: m.homeTeam, away: m.awayTeam }));

  return NextResponse.json({
    live: fmt(live),
    today: fmt(today),
    recent: fmt(recent),
    finishedCount: finished.length,
    finishedSample: fmt(finished.slice(0, 5)),
    // FDO entries that look like Spain or Cape Verde
    spainCapeVerde: fmt(finished.filter((m) =>
      m.homeTeam.name.toLowerCase().includes("spain") ||
      m.awayTeam.name.toLowerCase().includes("spain") ||
      m.homeTeam.name.toLowerCase().includes("cape verde") ||
      m.awayTeam.name.toLowerCase().includes("cape verde")
    )),
    stillPending,
  });
}
