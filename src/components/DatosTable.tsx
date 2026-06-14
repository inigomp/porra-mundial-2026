"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface DatosRow {
  rank: number;
  participantId: string;
  participantName: string;
  points: number;
  killerMundial: string;
  killerSeleccion: string;
  goalkeeper: string;
}

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i").replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u").replace(/ñ/g, "n");
}

function matches(value: string, filter: string): boolean {
  return norm(value).includes(norm(filter.trim()));
}

export default function DatosTable({ rows }: { rows: DatosRow[] }) {
  const [f, setF] = useState({
    name: "",
    killerMundial: "",
    killerSeleccion: "",
    goalkeeper: "",
  });

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          matches(r.participantName, f.name) &&
          matches(r.killerMundial, f.killerMundial) &&
          matches(r.killerSeleccion, f.killerSeleccion) &&
          matches(r.goalkeeper, f.goalkeeper)
      ),
    [rows, f]
  );

  const hasFilters = Object.values(f).some((v) => v.trim() !== "");

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
      {/* Filter row */}
      <div className="grid grid-cols-[3rem_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-[#2a2d3a] bg-[#13151f]">
        <div />
        <input
          value={f.name}
          onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nombre…"
          className="bg-[#1a1d26] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors"
        />
        <input
          value={f.killerMundial}
          onChange={(e) => setF((p) => ({ ...p, killerMundial: e.target.value }))}
          placeholder="Killer mundial…"
          className="bg-[#1a1d26] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors"
        />
        <input
          value={f.killerSeleccion}
          onChange={(e) => setF((p) => ({ ...p, killerSeleccion: e.target.value }))}
          placeholder="Killer España…"
          className="bg-[#1a1d26] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors"
        />
        <input
          value={f.goalkeeper}
          onChange={(e) => setF((p) => ({ ...p, goalkeeper: e.target.value }))}
          placeholder="Portero…"
          className="bg-[#1a1d26] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors"
        />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[3rem_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 border-b border-[#2a2d3a] text-[#6b7280] text-xs font-semibold uppercase tracking-widest">
        <span className="text-right">#</span>
        <span>Participante</span>
        <span>Killer Mundial</span>
        <span>Killer España</span>
        <span>Portero</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto max-h-[60vh]">
        {filtered.length === 0 ? (
          <p className="text-[#6b7280] text-sm text-center py-10">
            Sin resultados para ese filtro.
          </p>
        ) : (
          filtered.map((r) => (
            <div
              key={r.participantId}
              className="grid grid-cols-[3rem_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-[#2a2d3a] last:border-0 hover:bg-[#1e2130] items-center"
            >
              <span className="text-right text-[#6b7280] text-xs font-mono tabular-nums">
                {r.rank}
              </span>
              <div className="min-w-0">
                <Link
                  href={`/predicciones/${r.participantId}`}
                  className="text-white text-sm font-medium truncate block hover:text-[#00c853] transition-colors"
                >
                  {r.participantName}
                </Link>
                <span className="text-[#00c853] text-xs font-bold">{r.points} pts</span>
              </div>
              <span className="text-[#9ca3af] text-sm truncate">{r.killerMundial}</span>
              <span className="text-[#9ca3af] text-sm truncate">{r.killerSeleccion}</span>
              <span className="text-[#9ca3af] text-sm truncate">{r.goalkeeper}</span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#2a2d3a] flex items-center justify-between">
        <span className="text-[#6b7280] text-xs">
          {hasFilters
            ? `${filtered.length} de ${rows.length} participantes`
            : `${rows.length} participantes`}
        </span>
        {hasFilters && (
          <button
            onClick={() => setF({ name: "", killerMundial: "", killerSeleccion: "", goalkeeper: "" })}
            className="text-[#6b7280] text-xs hover:text-white transition-colors"
          >
            Limpiar filtros ×
          </button>
        )}
      </div>
    </div>
  );
}
