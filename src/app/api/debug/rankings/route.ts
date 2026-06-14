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
    finished_count: finished.length,
    detail_raw: details.filter(Boolean).slice(0, 1).map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = d as any;
      return {
        id: raw.id,
        top_level_keys: Object.keys(raw),
        // Check common lineup field names
        has_lineups: raw.lineups,
        has_lineup: raw.lineup,
        has_homeTeam_lineup: raw.homeTeam?.lineup,
        has_homeTeam_startXI: raw.homeTeam?.startXI,
      };
    }),
  });
}
