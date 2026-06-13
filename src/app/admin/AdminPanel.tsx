"use client";

import { useState, useEffect } from "react";
import { MATCHES } from "@/lib/participants";
import { Save, Trash2, RefreshCw } from "lucide-react";

type Override = { fixtureId: string; homeScore: number; awayScore: number; updatedAt: string };

// Only group stage matches with real team names
const editableMatches = MATCHES.filter(
  (m) => !m.homeTeam.toUpperCase().includes("OCTAVO") && !m.homeTeam.toUpperCase().includes("ACERTAR")
);

export default function AdminPanel() {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [editing, setEditing] = useState<{ fixtureId: string; homeScore: string; awayScore: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchOverrides();
  }, []);

  async function fetchOverrides() {
    try {
      const res = await fetch("/api/admin/overrides");
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides ?? []);
      }
    } catch {
      // ignore
    }
  }

  function startEdit(matchId: string) {
    const existing = overrides.find((o) => o.fixtureId === matchId);
    const m = MATCHES.find((m) => m.id === matchId);
    setEditing({
      fixtureId: matchId,
      homeScore: existing ? String(existing.homeScore) : m?.homeScore !== null ? String(m?.homeScore) : "",
      awayScore: existing ? String(existing.awayScore) : m?.awayScore !== null ? String(m?.awayScore) : "",
    });
    setStatus("");
  }

  async function saveOverride() {
    if (!editing) return;
    const home = parseInt(editing.homeScore, 10);
    const away = parseInt(editing.awayScore, 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setStatus("Introduce goles válidos (≥ 0)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId: editing.fixtureId, homeScore: home, awayScore: away }),
      });
      if (res.ok) {
        setStatus("Guardado ✓");
        setEditing(null);
        await fetchOverrides();
      } else {
        setStatus("Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteOverride(fixtureId: string) {
    try {
      await fetch(`/api/admin/overrides?fixtureId=${fixtureId}`, { method: "DELETE" });
      await fetchOverrides();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className="bg-[#00c853]/10 border border-[#00c853]/30 text-[#00c853] text-sm px-4 py-2.5 rounded-lg">
          {status}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[#9ca3af] text-sm">
          {overrides.length} override{overrides.length !== 1 ? "s" : ""} activo{overrides.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={fetchOverrides}
          className="flex items-center gap-1.5 text-[#6b7280] hover:text-white text-xs transition-colors"
        >
          <RefreshCw size={12} />
          Actualizar
        </button>
      </div>

      <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#6b7280] text-xs border-b border-[#2a2d3a] bg-[#13151f]">
              <th className="px-4 py-2.5 text-left font-medium">Partido</th>
              <th className="px-4 py-2.5 text-center font-medium">Resultado actual</th>
              <th className="px-4 py-2.5 text-center font-medium">Override</th>
              <th className="px-4 py-2.5 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2d3a]">
            {editableMatches.map((match) => {
              const override = overrides.find((o) => o.fixtureId === match.id);
              const isEditing = editing?.fixtureId === match.id;

              return (
                <tr key={match.id} className={`${override ? "bg-[#ffd700]/5" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-white text-xs">
                    {match.homeTeam} vs {match.awayTeam}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[#9ca3af] text-xs tabular-nums">
                    {match.homeScore !== null
                      ? `${match.homeScore} – ${match.awayScore}`
                      : "No jugado"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={editing.homeScore}
                          onChange={(e) => setEditing({ ...editing, homeScore: e.target.value })}
                          className="w-12 bg-[#0f1117] border border-[#ffd700] rounded px-2 py-1 text-xs text-white text-center tabular-nums outline-none"
                        />
                        <span className="text-[#6b7280]">–</span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={editing.awayScore}
                          onChange={(e) => setEditing({ ...editing, awayScore: e.target.value })}
                          className="w-12 bg-[#0f1117] border border-[#ffd700] rounded px-2 py-1 text-xs text-white text-center tabular-nums outline-none"
                        />
                      </div>
                    ) : override ? (
                      <span className="text-[#ffd700] font-bold tabular-nums text-xs">
                        {override.homeScore} – {override.awayScore}
                      </span>
                    ) : (
                      <span className="text-[#4b5563] text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveOverride}
                            disabled={saving}
                            className="flex items-center gap-1 bg-[#00c853] text-black text-xs font-bold px-2.5 py-1 rounded hover:bg-green-400 transition-colors disabled:opacity-50"
                          >
                            <Save size={11} />
                            Guardar
                          </button>
                          <button
                            onClick={() => { setEditing(null); setStatus(""); }}
                            className="text-[#6b7280] text-xs hover:text-white transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(match.id)}
                            className="text-[#ffd700] text-xs hover:text-yellow-300 transition-colors font-medium"
                          >
                            Editar
                          </button>
                          {override && (
                            <button
                              onClick={() => deleteOverride(match.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[#4b5563] text-xs">
        Los overrides tienen prioridad sobre los datos estáticos y la API.
        Se pierden al reiniciar el servidor.
      </p>
    </div>
  );
}
