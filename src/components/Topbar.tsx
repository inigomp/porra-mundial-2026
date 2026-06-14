import { Bell } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { PARTICIPANTS } from "@/lib/participants";
import ProfileSwitcher from "./ProfileSwitcher";
import ParticipantSearch from "./ParticipantSearch";

export default async function Topbar() {
  const cookieStore = await cookies();
  const identityId = cookieStore.get("porra_identity")?.value;
  const participant = identityId ? PARTICIPANTS.find((p) => p.id === identityId) : null;

  const displayName = participant?.name ?? "Identidad no seleccionada";
  const initials = participant
    ? participant.name.split(" ").map((n) => n[0]).slice(0, 2).join("")
    : "?";

  return (
    <header className="fixed top-0 left-0 md:left-56 right-0 h-14 bg-[#13151f] border-b border-[#2a2d3a] flex items-center px-4 md:px-6 gap-4 z-10">
      {/* Title */}
      <p className="font-bold text-white text-sm tracking-wide flex-shrink-0">
        Porra Mundial 2026
      </p>

      {/* Live badge */}
      <div className="flex items-center gap-1.5 bg-[#1e2130] border border-[#2a2d3a] rounded-full px-3 py-1 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-live" />
        <span className="text-xs font-bold text-white">EN DIRECTO</span>
      </div>

      {/* Search — hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-xs">
        <ParticipantSearch participants={PARTICIPANTS.map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="text-[#6b7280] hover:text-white transition-colors">
          <Bell size={16} />
        </button>
        <ProfileSwitcher currentId={identityId ?? null} />
        {participant ? (
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-full bg-[#ffd700] flex items-center justify-center text-black font-bold text-xs">
              {initials}
            </div>
            <span className="text-sm font-medium text-white">{displayName}</span>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 ml-1 text-[#ffd700] text-xs font-semibold hover:text-yellow-300 transition-colors"
          >
            Seleccionar identidad
          </Link>
        )}
      </div>
    </header>
  );
}
