"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  count: number;
  names: string[];
  label: string; // e.g. "portero local" or "killer"
}

export default function StakesPopover({ count, names, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[#00c853] font-black text-2xl leading-none tabular-nums hover:text-green-400 transition-colors cursor-pointer select-none"
        aria-label={`Ver los ${count} participantes con ${label}`}
      >
        {count}
      </button>

      {open && names.length > 0 && (
        <div
          className="absolute z-50 left-0 top-full mt-1 w-56 bg-[#1a1d26] border border-[#2a2d3a] rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
          style={{ minWidth: "14rem" }}
        >
          <div className="px-3 py-2 border-b border-[#2a2d3a]">
            <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wide">
              {count} con {label}
            </p>
          </div>
          <ul className="overflow-y-auto max-h-60">
            {names.map((name) => (
              <li
                key={name}
                className="px-3 py-1.5 text-white text-xs border-b border-[#2a2d3a] last:border-0 hover:bg-[#1e2130]"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
