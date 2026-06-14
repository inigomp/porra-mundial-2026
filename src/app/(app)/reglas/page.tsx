export default function ReglasPage() {
  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-white font-bold text-xl">Reglas de la porra</h1>
        <p className="text-[#6b7280] text-sm mt-1">Porra Mundial 2026 · Liga de Predicciones Elite</p>
      </div>

      {/* Match scoring */}
      <section className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2d3a] bg-[#1e2130]">
          <h2 className="text-white font-bold text-sm">⚽ Puntuación por partido</h2>
          <p className="text-[#6b7280] text-xs mt-0.5">Aplicable a fase de grupos y eliminatorias</p>
        </div>
        <div className="divide-y divide-[#2a2d3a]">
          {[
            { label: "Marcador exacto", desc: "Aciertas el resultado exacto (ej. 2-1 → 2-1)", pts: "+3", color: "text-[#00c853]" },
            { label: "Signo + diferencia", desc: "Aciertas el 1X2 y la diferencia de goles", pts: "+2", color: "text-blue-400" },
            { label: "Solo el signo", desc: "Aciertas quién gana o que hay empate", pts: "+1", color: "text-yellow-400" },
            { label: "Resultado incorrecto", desc: "No aciertas el signo", pts: "0", color: "text-[#6b7280]" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-white text-sm font-medium">{row.label}</p>
                <p className="text-[#6b7280] text-xs mt-0.5">{row.desc}</p>
              </div>
              <span className={`font-bold text-lg tabular-nums ${row.color}`}>{row.pts}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Goalkeeper */}
      <section className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2d3a] bg-[#1e2130]">
          <h2 className="text-white font-bold text-sm">🧤 Portero</h2>
          <p className="text-[#6b7280] text-xs mt-0.5">Puntos por partido jugado por tu portero elegido</p>
        </div>
        <div className="divide-y divide-[#2a2d3a]">
          {[
            { label: "Portería a cero (0 goles)", pts: "+3", color: "text-[#00c853]" },
            { label: "1 gol encajado", pts: "0", color: "text-[#6b7280]" },
            { label: "2 goles encajados", pts: "−1", color: "text-red-400" },
            { label: "3 goles encajados", pts: "−2", color: "text-red-400" },
            { label: "4+ goles encajados", pts: "−3", color: "text-red-500" },
            { label: "No juega / sale antes del min. 75 sin lesión", pts: "−2", color: "text-red-400" },
            { label: "No juega / sale antes del min. 75 con lesión", pts: "0", color: "text-[#6b7280]" },
            { label: "Tarjeta roja (adicional a los goles)", pts: "−2", color: "text-red-400" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <p className="text-white text-sm">{row.label}</p>
              <span className={`font-bold text-sm tabular-nums ${row.color}`}>{row.pts}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-[#1e2130] border-t border-[#2a2d3a]">
          <p className="text-[#6b7280] text-xs">
            ℹ️ Los goles de penalti <strong className="text-[#9ca3af]">no cuentan</strong>. Los goles en prórroga <strong className="text-[#9ca3af]">sí cuentan</strong>.
          </p>
        </div>
      </section>

      {/* Killers */}
      <section className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2d3a] bg-[#1e2130]">
          <h2 className="text-white font-bold text-sm">🔪 Killers</h2>
          <p className="text-[#6b7280] text-xs mt-0.5">Por cada gol marcado por tu killer (sin penaltis, con prórroga)</p>
        </div>
        <div className="divide-y divide-[#2a2d3a]">
          {[
            { label: "Killer del mundial", desc: "Máximo goleador del torneo que elegiste", pts: "+2 por gol", color: "text-[#00c853]" },
            { label: "Killer de la selección", desc: "Máximo goleador de tu selección que elegiste", pts: "+1 por gol", color: "text-yellow-400" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-white text-sm font-medium">{row.label}</p>
                <p className="text-[#6b7280] text-xs mt-0.5">{row.desc}</p>
              </div>
              <span className={`font-bold text-sm ${row.color}`}>{row.pts}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Special bets */}
      <section className="bg-[#1a1d26] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2d3a] bg-[#1e2130]">
          <h2 className="text-white font-bold text-sm">🏆 Apuestas especiales</h2>
        </div>
        <div className="divide-y divide-[#2a2d3a]">
          {[
            { label: "Tercer clasificado del mundial", pts: "+4", color: "text-yellow-400" },
            { label: "Campeón del mundial", pts: "+8", color: "text-[#ffd700]" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <p className="text-white text-sm">{row.label}</p>
              <span className={`font-bold text-sm ${row.color}`}>{row.pts}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[#6b7280] text-xs text-center pb-4">
        Porra Mundial 2026 · Reglamento oficial · Cualquier duda, pregunta al organizador
      </p>
    </main>
  );
}
