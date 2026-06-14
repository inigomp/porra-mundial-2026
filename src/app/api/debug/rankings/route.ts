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
    lineups_raw: details.filter(Boolean).slice(0, 1).map((d) => ({
      id: d!.id,
      lineups_keys: d!.lineups ? Object.keys(d!.lineups) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lineups_full: d!.lineups as any,
    })),
  });
}
