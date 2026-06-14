"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Participant = { id: string; name: string };

interface ParticipantSearchProps {
  participants: Participant[];
}

export default function ParticipantSearch({ participants }: ParticipantSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? participants.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(id: string) {
    setQuery("");
    setOpen(false);
    router.push(`/predicciones/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
    if (e.key === "Enter" && results.length === 1) {
      navigate(results[0].id);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563] pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar predicciones..."
          className="w-full bg-[#1e2130] border border-[#2a2d3a] rounded-full pl-8 pr-4 py-1.5 text-xs text-[#9ca3af] placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-[#1a1d26] border border-[#2a2d3a] rounded-xl shadow-2xl z-50 overflow-hidden">
          {results.slice(0, 8).map((p) => {
            const initials = p.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("");
            return (
              <button
                key={p.id}
                onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                onClick={() => navigate(p.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a2d3a] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-[#2a2d3a] flex items-center justify-center text-xs font-bold text-[#ffd700] flex-shrink-0">
                  {initials}
                </div>
                <span className="text-sm text-white">{p.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-[#1a1d26] border border-[#2a2d3a] rounded-xl shadow-2xl z-50 px-4 py-3">
          <p className="text-[#6b7280] text-xs">Sin resultados para &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
