import { NextResponse } from "next/server";
import { getLiveWCMatches, getTodayWCMatches } from "@/lib/football-data-org";
import { getAllSyncedScores } from "@/lib/score-overrides";

export async function GET() {
  const [live, today] = await Promise.all([
    getLiveWCMatches(),
    getTodayWCMatches(),
  ]);

  return NextResponse.json({
    live: live.map((m) => ({
      id: m.id,
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      status: m.status,
      fullTime: m.score.fullTime,
      halfTime: m.score.halfTime,
    })),
    today: today.map((m) => ({
      id: m.id,
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      status: m.status,
      fullTime: m.score.fullTime,
      halfTime: m.score.halfTime,
    })),
    syncedScores: getAllSyncedScores(),
  });
}
