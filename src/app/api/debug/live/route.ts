import { NextResponse } from "next/server";
import { getLiveWCMatches, getTodayWCMatches, getRecentWCMatches } from "@/lib/football-data-org";
import { getAllSyncedScores } from "@/lib/score-overrides";

export async function GET() {
  const [live, today, recent] = await Promise.all([
    getLiveWCMatches(),
    getTodayWCMatches(),
    getRecentWCMatches(2),
  ]);

  const fmt = (arr: typeof live) => arr.map((m) => ({
    id: m.id, home: m.homeTeam.name, away: m.awayTeam.name,
    status: m.status, fullTime: m.score.fullTime, halfTime: m.score.halfTime,
  }));

  return NextResponse.json({
    live: fmt(live),
    today: fmt(today),
    recent: fmt(recent),
    syncedScores: getAllSyncedScores(),
  });
}
