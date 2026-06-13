import { NextRequest, NextResponse } from "next/server";
import { PARTICIPANTS } from "@/lib/participants";

/** GET /api/players — returns all 106 participants (id, name, killer, goalkeeper) */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const participant = PARTICIPANTS.find((p) => p.id === id);
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    return NextResponse.json(participant);
  }

  // Return stripped list (no predictions to keep response small)
  const list = PARTICIPANTS.map(({ id, name, killerMundial, killerSeleccion, goalkeeper }) => ({
    id,
    name,
    killerMundial,
    killerSeleccion,
    goalkeeper,
  }));

  return NextResponse.json({ total: list.length, participants: list });
}
