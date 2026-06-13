"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

type Participant = { id: string; name: string };

export default function LoginPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);

  async function loadParticipants() {
    if (participants) return;
    setLoading(true);
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      setParticipants(data.participants ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function selectIdentity(id: string) {
    setSelecting(id);
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: id }),
      });
      router.push("/");
      router.refresh();
    } finally {
      setSelecting(null);
    }
  }

  const filtered = (participants ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ffd700] mb-4">
            <Users size={28} className="text-black" />
          </div>
          <h1 className="text-white font-bold text-2xl">¿Quién eres?</h1>
          <p className="text-[#6b7280] text-sm mt-2">
            Selecciona tu nombre para ver tus predicciones y puntuación
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-2xl p-6">
          {!participants ? (
            <button
              onClick={loadParticipants}
              disabled={loading}
              className="w-full bg-[#ffd700] text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Ver participantes"}
            </button>
          ) : (
            <>
              <input
                type="search"
                placeholder="Buscar tu nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] mb-4 transition-colors"
                autoFocus
              />

              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <p className="text-[#6b7280] text-sm text-center py-4">
                    No se encontró &ldquo;{search}&rdquo;
                  </p>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectIdentity(p.id)}
                      disabled={selecting !== null}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2a2d3a] transition-colors text-left group disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#2a2d3a] group-hover:bg-[#3a3d4a] flex items-center justify-center text-xs font-bold text-[#ffd700] flex-shrink-0 transition-colors">
                        {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <span className="text-white text-sm font-medium flex-1">{p.name}</span>
                      {selecting === p.id && (
                        <span className="text-[#ffd700] text-xs">Entrando...</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-[#4b5563] text-xs text-center mt-4">
          Porra Mundial 2026 · Liga privada
        </p>
      </div>
    </div>
  );
}
