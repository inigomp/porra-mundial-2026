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
  finalista1: string;
  finalista2: string;
  campeon: string;
}

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i").replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u").replace(/ñ/g, "n");
}

function distinct(rows: DatosRow[], key: keyof DatosRow): string[] {
  const set = new Set(rows.map((r) => String(r[key])).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

const selectCls =
  "bg-[#1a1d26] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ffd700] transition-colors appearance-none cursor-pointer w-full";

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export default function DatosTable({ rows }: { rows: DatosRow[] }) {
  const [f, setF] = useState({
    name: "",
    killerMundial: "",
    killerSeleccion: "",
    goalkeeper: "",
    finalista1: "",
    finalista2: "",
    campeon: "",
  });

  const opts = useMemo(() => ({
    killerMundial:   distinct(rows, "killerMundial"),
    killerSeleccion: distinct(rows, "killerSeleccion"),
    goalkeeper:      distinct(rows, "goalkeeper"),
    finalista1:      distinct(rows, "finalista1"),
    finalista2:      distinct(rows, "finalista2"),
    campeon:         distinct(rows, "campeon"),
  }), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (f.name.trim() === "" || norm(r.participantName).includes(norm(f.name.trim()))) &&
          (f.killerMundial   === "" || r.killerMundial   === f.killerMundial) &&
          (f.killerSeleccion === "" || r.killerSeleccion === f.killerSeleccion) &&
          (f.goalkeeper      === "" || r.goalkeeper      === f.goalkeeper) &&
          (f.finalista1      === "" || r.finalista1      === f.finalista1) &&
          (f.finalista2      === "" || r.finalista2      === f.finalista2) &&
          (f.campeon         === "" || r.campeon         === f.campeon)
      ),
    [rows, f]
  );

  const hasFilters = Object.values(f).some((v) => v.trim() !== "");

  return (
    <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
      {/* Filter row */}
      <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-[#2a2d3a] bg-[#13151f]">
        <div />
        <input
          value={f.name}
          onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nombre…"
          className="bg-[#1a1d26] border border-[#2a2d3a] rounded px-2 py-1 text-xs text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors w-full"
        />
        <FilterSelect value={f.killerMundial}   onChange={(v) => setF((p) => ({ ...p, killerMundial: v }))}   options={opts.killerMundial}   placeholder="Todos…" />
        <FilterSelect value={f.killerSeleccion} onChange={(v) => setF((p) => ({ ...p, killerSeleccion: v }))} options={opts.killerSeleccion} placeholder="Todos…" />
        <FilterSelect value={f.goalkeeper}      onChange={(v) => setF((p) => ({ ...p, goalkeeper: v }))}      options={opts.goalkeeper}      placeholder="Todos…" />
        <FilterSelect value={f.finalista1}      onChange={(v) => setF((p) => ({ ...p, finalista1: v }))}      options={opts.finalista1}      placeholder="Todos…" />
        <FilterSelect value={f.finalista2}      onChange={(v) => setF((p) => ({ ...p, finalista2: v }))}      options={opts.finalista2}      placeholder="Todos…" />
        <FilterSelect value={f.campeon}         onChange={(v) => setF((p) => ({ ...p, campeon: v }))}         options={opts.campeon}         placeholder="Todos…" />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 border-b border-[#2a2d3a] text-[#6b7280] text-xs font-semibold uppercase tracking-widest">
        <span className="text-right">#</span>
        <span>Participante</span>
        <span>Killer Mundial</span>
        <span>Killer España</span>
        <span>Portero</span>
        <span>Finalista 1</span>
        <span>Finalista 2</span>
        <span>Campeón</span>
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
              className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-[#2a2d3a] last:border-0 hover:bg-[#1e2130] items-start"
            >
              <span className="text-right text-[#6b7280] text-xs font-mono tabular-nums self-start pt-1">
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
              <span className="text-[#9ca3af] text-sm truncate">{r.finalista1 || '—'}</span>
              <span className="text-[#9ca3af] text-sm truncate">{r.finalista2 || '—'}</span>
              <span className="text-[#ffd700] text-sm font-medium truncate">{r.campeon || '—'}</span>
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
            onClick={() => setF({ name: "", killerMundial: "", killerSeleccion: "", goalkeeper: "", finalista1: "", finalista2: "", campeon: "" })}
            className="text-[#6b7280] text-xs hover:text-white transition-colors"
          >
            Limpiar filtros ×
          </button>
        )}
      </div>
    </div>
  );
}
