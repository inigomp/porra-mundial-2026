"use client";

import { useState, useEffect } from "react";
import { MATCHES, PARTICIPANTS } from "@/lib/participants";
import { Save, Trash2, RefreshCw } from "lucide-react";

type Override = { fixtureId: string; homeScore: number; awayScore: number; updatedAt: string };
type KillerOverride = { playerName: string; mundialGoals: number; updatedAt: string };
type GkOverride = { gkName: string; points: number; updatedAt: string };

// Only group stage matches with real team names
const editableMatches = MATCHES.filter(
  (m) => !m.homeTeam.toUpperCase().includes("OCTAVO") && !m.homeTeam.toUpperCase().includes("ACERTAR")
);

export default function AdminPanel() {
  const [tab, setTab] = useState<"matches" | "killers" | "gk">("matches");
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [editing, setEditing] = useState<{ fixtureId: string; homeScore: string; awayScore: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  // Killer / GK overrides state
  const [killerOverrides, setKillerOverrides] = useState<KillerOverride[]>([]);
  const [gkOverrides, setGkOverrides] = useState<GkOverride[]>([]);
  const [currentKillerGoals, setCurrentKillerGoals] = useState<Record<string, number>>({});
  const [currentGkPoints, setCurrentGkPoints] = useState<Record<string, number>>({});
  const [editingKiller, setEditingKiller] = useState<{ playerName: string; value: string } | null>(null);
  const [editingGk, setEditingGk] = useState<{ gkName: string; value: string } | null>(null);

  // Unique killer names from participants
  const uniqueKillers = Array.from(new Set(PARTICIPANTS.map((p) => p.killerMundial))).sort();
  // Unique GK names from participants
  const uniqueGks = Array.from(new Set(PARTICIPANTS.map((p) => p.goalkeeper))).sort();

  useEffect(() => {
    fetchOverrides();
    fetchKillerGkOverrides();
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

  async function fetchKillerGkOverrides() {
    try {
      const res = await fetch("/api/admin/killer-gk-overrides");
      if (res.ok) {
        const data = await res.json();
        setKillerOverrides(data.killerOverrides ?? []);
        setGkOverrides(data.gkOverrides ?? []);
        setCurrentKillerGoals(data.currentKillerGoals ?? {});
        setCurrentGkPoints(data.currentGkPoints ?? {});
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

  async function saveKillerOverride() {
    if (!editingKiller) return;
    const goals = parseInt(editingKiller.value, 10);
    if (isNaN(goals) || goals < 0) { setStatus("Goles inválidos (≥ 0)"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/killer-gk-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "killer", playerName: editingKiller.playerName, mundialGoals: goals }),
      });
      if (res.ok) { setStatus("Guardado ✓"); setEditingKiller(null); await fetchKillerGkOverrides(); }
      else setStatus("Error al guardar");
    } finally { setSaving(false); }
  }

  async function deleteKillerOverride(playerName: string) {
    await fetch(`/api/admin/killer-gk-overrides?type=killer&name=${encodeURIComponent(playerName)}`, { method: "DELETE" });
    await fetchKillerGkOverrides();
  }

  async function saveGkOverride() {
    if (!editingGk) return;
    const pts = parseInt(editingGk.value, 10);
    if (isNaN(pts)) { setStatus("Puntos inválidos"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/killer-gk-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gk", gkName: editingGk.gkName, points: pts }),
      });
      if (res.ok) { setStatus("Guardado ✓"); setEditingGk(null); await fetchKillerGkOverrides(); }
      else setStatus("Error al guardar");
    } finally { setSaving(false); }
  }

  async function deleteGkOverride(gkName: string) {
    await fetch(`/api/admin/killer-gk-overrides?type=gk&name=${encodeURIComponent(gkName)}`, { method: "DELETE" });
    await fetchKillerGkOverrides();
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className="bg-[#00c853]/10 border border-[#00c853]/30 text-[#00c853] text-sm px-4 py-2.5 rounded-lg">
          {status}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#2a2d3a] pb-2">
        {(["matches", "killers", "gk"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatus(""); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${tab === t ? "bg-[#ffd700] text-black" : "text-[#6b7280] hover:text-white"}`}
          >
            {t === "matches" ? "Partidos" : t === "killers" ? "Killers" : "Porteros"}
          </button>
        ))}
      </div>

      {/* ── Matches tab ── */}
      {tab === "matches" && (
        <div className="space-y-4">
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
      )}

      {/* ── Killers tab ── */}
      {tab === "killers" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[#9ca3af] text-sm">
              {killerOverrides.length} override{killerOverrides.length !== 1 ? "s" : ""} activo{killerOverrides.length !== 1 ? "s" : ""}
            </p>
            <button onClick={fetchKillerGkOverrides} className="flex items-center gap-1.5 text-[#6b7280] hover:text-white text-xs transition-colors">
              <RefreshCw size={12} /> Actualizar
            </button>
          </div>
          <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#6b7280] text-xs border-b border-[#2a2d3a] bg-[#13151f]">
                  <th className="px-4 py-2.5 text-left font-medium">Jugador (killer mundial)</th>
                  <th className="px-4 py-2.5 text-center font-medium">Goles actuales</th>
                  <th className="px-4 py-2.5 text-center font-medium">Override</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d3a]">
                {uniqueKillers.map((playerName) => {
                  const ov = killerOverrides.find((k) => k.playerName === playerName);
                  const current = currentKillerGoals[playerName];
                  const isEd = editingKiller?.playerName === playerName;
                  return (
                    <tr key={playerName} className={ov ? "bg-[#ffd700]/5" : ""}>
                      <td className="px-4 py-2 text-white text-xs">{playerName}</td>
                      <td className="px-4 py-2 text-center text-[#9ca3af] text-xs tabular-nums">
                        {current !== undefined ? `${current} goles` : <span className="text-[#4b5563]">sin caché</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isEd ? (
                          <input
                            type="number" min={0} max={99}
                            value={editingKiller.value}
                            onChange={(e) => setEditingKiller({ ...editingKiller, value: e.target.value })}
                            className="w-14 bg-[#0f1117] border border-[#ffd700] rounded px-2 py-1 text-xs text-white text-center tabular-nums outline-none"
                          />
                        ) : ov ? (
                          <span className="text-[#ffd700] font-bold text-xs">{ov.mundialGoals} goles</span>
                        ) : (
                          <span className="text-[#4b5563] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEd ? (
                            <>
                              <button onClick={saveKillerOverride} disabled={saving} className="flex items-center gap-1 bg-[#00c853] text-black text-xs font-bold px-2.5 py-1 rounded hover:bg-green-400 disabled:opacity-50">
                                <Save size={11} /> Guardar
                              </button>
                              <button onClick={() => { setEditingKiller(null); setStatus(""); }} className="text-[#6b7280] text-xs hover:text-white">Cancelar</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingKiller({ playerName, value: String(ov?.mundialGoals ?? "") }); setStatus(""); }} className="text-[#ffd700] text-xs hover:text-yellow-300 font-medium">Editar</button>
                              {ov && <button onClick={() => deleteKillerOverride(playerName)} className="text-red-400 hover:text-red-300"><Trash2 size={13} /></button>}
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
          <p className="text-[#4b5563] text-xs">Solo se sobreescriben los goles del killer mundial. Se usa en lugar del dato de la API.</p>
        </div>
      )}

      {/* ── GK tab ── */}
      {tab === "gk" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[#9ca3af] text-sm">
              {gkOverrides.length} override{gkOverrides.length !== 1 ? "s" : ""} activo{gkOverrides.length !== 1 ? "s" : ""}
            </p>
            <button onClick={fetchKillerGkOverrides} className="flex items-center gap-1.5 text-[#6b7280] hover:text-white text-xs transition-colors">
              <RefreshCw size={12} /> Actualizar
            </button>
          </div>
          <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#6b7280] text-xs border-b border-[#2a2d3a] bg-[#13151f]">
                  <th className="px-4 py-2.5 text-left font-medium">Portero</th>
                  <th className="px-4 py-2.5 text-center font-medium">Pts actuales</th>
                  <th className="px-4 py-2.5 text-center font-medium">Override</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d3a]">
                {uniqueGks.map((gkName) => {
                  const ov = gkOverrides.find((g) => g.gkName === gkName);
                  const current = currentGkPoints[gkName];
                  const isEd = editingGk?.gkName === gkName;
                  return (
                    <tr key={gkName} className={ov ? "bg-[#ffd700]/5" : ""}>
                      <td className="px-4 py-2 text-white text-xs">{gkName}</td>
                      <td className="px-4 py-2 text-center text-[#9ca3af] text-xs tabular-nums">
                        {current !== undefined ? `${current} pts` : <span className="text-[#4b5563]">sin caché</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isEd ? (
                          <input
                            type="number"
                            value={editingGk.value}
                            onChange={(e) => setEditingGk({ ...editingGk, value: e.target.value })}
                            className="w-14 bg-[#0f1117] border border-[#ffd700] rounded px-2 py-1 text-xs text-white text-center tabular-nums outline-none"
                          />
                        ) : ov ? (
                          <span className="text-[#ffd700] font-bold text-xs">{ov.points} pts</span>
                        ) : (
                          <span className="text-[#4b5563] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEd ? (
                            <>
                              <button onClick={saveGkOverride} disabled={saving} className="flex items-center gap-1 bg-[#00c853] text-black text-xs font-bold px-2.5 py-1 rounded hover:bg-green-400 disabled:opacity-50">
                                <Save size={11} /> Guardar
                              </button>
                              <button onClick={() => { setEditingGk(null); setStatus(""); }} className="text-[#6b7280] text-xs hover:text-white">Cancelar</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingGk({ gkName, value: String(ov?.points ?? "") }); setStatus(""); }} className="text-[#ffd700] text-xs hover:text-yellow-300 font-medium">Editar</button>
                              {ov && <button onClick={() => deleteGkOverride(gkName)} className="text-red-400 hover:text-red-300"><Trash2 size={13} /></button>}
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
          <p className="text-[#4b5563] text-xs">Los puntos de portero son el total del torneo. Al poner un override, se ignora el cálculo automático para ese portero.</p>
        </div>
      )}
    </div>
  );
}
