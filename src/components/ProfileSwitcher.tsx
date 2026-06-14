"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";

type Participant = { id: string; name: string };

interface ProfileSwitcherProps {
  currentId: string | null;
}

export default function ProfileSwitcher({ currentId }: ProfileSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load participants once when first opened
  useEffect(() => {
    if (open && !participants) {
      fetch("/api/players")
        .then((r) => r.json())
        .then((data) => setParticipants(data.participants ?? []));
    }
  }, [open, participants]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function selectIdentity(id: string) {
    if (selecting) return;
    setSelecting(id);
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: id }),
      });
      setOpen(false);
      setSearch("");
      router.refresh();
    } finally {
      setSelecting(null);
    }
  }

  const filtered = (participants ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`transition-colors ${open ? "text-[#ffd700]" : "text-[#6b7280] hover:text-white"}`}
        title="Cambiar perfil"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-72 bg-[#1a1d26] border border-[#2a2d3a] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3a]">
            <p className="text-white text-sm font-semibold">Cambiar perfil</p>
            <button
              onClick={() => setOpen(false)}
              className="text-[#6b7280] hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <input
              type="search"
              placeholder="Buscar tu nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-xs text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors"
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            {!participants ? (
              <p className="text-[#6b7280] text-xs text-center py-4">Cargando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-[#6b7280] text-xs text-center py-4">Sin resultados</p>
            ) : (
              filtered.map((p) => {
                const isCurrent = p.id === currentId;
                const isSelecting = selecting === p.id;
                const initials = p.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
                return (
                  <button
                    key={p.id}
                    onClick={() => selectIdentity(p.id)}
                    disabled={!!selecting}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isCurrent
                        ? "bg-[#ffd700]/10 text-[#ffd700]"
                        : "text-white hover:bg-[#2a2d3a]"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isCurrent ? "bg-[#ffd700] text-black" : "bg-[#2a2d3a] text-[#ffd700]"
                      }`}
                    >
                      {isSelecting ? (
                        <span className="animate-spin text-[10px]">⟳</span>
                      ) : (
                        initials
                      )}
                    </div>
                    <span className="text-sm flex-1">{p.name}</span>
                    {isCurrent && <Check size={13} className="flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
