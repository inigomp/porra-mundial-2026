import { NextRequest, NextResponse } from "next/server";
import {
  getWCTopScorers,
  getAllFinishedWCMatches,
  getMatchDetail,
} from "@/lib/football-data-org";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret.trim() !== (process.env.ADMIN_SECRET ?? "").trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scorers, finished] = await Promise.all([
    getWCTopScorers(10),
    getAllFinishedWCMatches(),
  ]);

  const recentIds = finished
    .slice()
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 3)
    .map((m) => m.id);

  const details = await Promise.all(recentIds.map(getMatchDetail));

  return NextResponse.json({
    scorers_count: scorers.length,
    scorers_sample: scorers.slice(0, 3).map((s) => ({ name: s.player.name, goals: s.goals })),
    finished_count: finished.length,
    details_fetched: details.filter(Boolean).length,
    details_sample: details.filter(Boolean).slice(0, 2).map((d) => ({
      id: d!.id,
      status: d!.status,
      home: d!.homeTeam.name,
      away: d!.awayTeam.name,
      has_lineups: d!.lineups !== null,
      home_gk: d!.lineups?.homeTeam?.startXI?.find((p) => p.position === "Goalkeeper")?.name ?? "NOT FOUND",
      away_gk: d!.lineups?.awayTeam?.startXI?.find((p) => p.position === "Goalkeeper")?.name ?? "NOT FOUND",
    })),
  });
}
