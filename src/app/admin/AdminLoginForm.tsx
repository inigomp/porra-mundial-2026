"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError("Contraseña incorrecta");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[#9ca3af] text-xs font-medium mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4b5563] outline-none focus:border-[#ffd700] transition-colors"
            autoFocus
          />
        </div>
        {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-[#ffd700] text-black font-bold py-2.5 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
      >
        {loading ? "Verificando..." : "Entrar"}
      </button>
    </form>
  );
}
