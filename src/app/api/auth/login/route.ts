import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PARTICIPANTS } from "@/lib/participants";

/**
 * POST /api/auth/login
 * Body: { participantId: string }
 *
 * Sets a httpOnly cookie `porra_identity` with the participant ID.
 * No password required — this is a friendly porra between known people.
 */
export async function POST(request: NextRequest) {
  let body: { participantId: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { participantId } = body;

  if (!participantId || typeof participantId !== "string") {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  const participant = PARTICIPANTS.find((p) => p.id === participantId);
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set("porra_identity", participantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return NextResponse.json({ ok: true, participantId, name: participant.name });
}

/**
 * GET /api/auth/login
 * Returns the current identity (if set).
 */
export async function GET() {
  const cookieStore = await cookies();
  const participantId = cookieStore.get("porra_identity")?.value;

  if (!participantId) {
    return NextResponse.json({ participantId: null, name: null });
  }

  const participant = PARTICIPANTS.find((p) => p.id === participantId);
  return NextResponse.json({
    participantId: participantId ?? null,
    name: participant?.name ?? null,
  });
}
