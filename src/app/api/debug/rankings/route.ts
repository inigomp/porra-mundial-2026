import { NextRequest, NextResponse } from "next/server";
import {
  getWCTopScorers,
  getAllFinishedWCMatches,
  getMatchDetail,
} from "@/lib/football-data-org";
import { getEnrichedRankings } from "@/lib/enriched-rankings";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret.trim() !== (process.env.ADMIN_SECRET ?? "").trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rankings, finished] = await Promise.all([
    getEnrichedRankings(),
    getAllFinishedWCMatches(),
  ]);

  return NextResponse.json({
    finished_count: finished.length,
    finished_teams: finished.map((m) => ({ home: m.homeTeam.name, away: m.awayTeam.name, score: m.score.fullTime })),
    killerMundial: rankings.killerMundial,
    killerSeleccion: rankings.killerSeleccion,
    topGoalkeepers: rankings.topGoalkeepers,
  });
}
