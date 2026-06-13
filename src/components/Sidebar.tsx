"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  BarChart3,
  Radio,
  BookOpen,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/", label: "TABLERO", icon: LayoutDashboard },
  { href: "/predicciones", label: "PREDICCIONES", icon: ListChecks },
  { href: "/clasificacion", label: "CLASIFICACIÓN", icon: BarChart3 },
  { href: "/directo", label: "PARTIDOS EN VIVO", icon: Radio },
  { href: "/reglas", label: "REGLAS", icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#13151f] border-r border-[#2a2d3a] flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-[#2a2d3a]">
        <p className="text-white font-bold text-sm leading-tight">Porra Mundial</p>
        <p className="text-[#6b7280] text-xs mt-0.5">Liga de Predicciones Elite</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                active
                  ? "bg-[#00c853] text-black"
                  : "text-[#9ca3af] hover:bg-[#1e2130] hover:text-white"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* CTA */}
      <div className="px-4 pb-4 space-y-3">
        <button className="w-full bg-[#ffd700] text-black font-bold text-xs py-2.5 rounded-lg hover:bg-yellow-400 transition-colors">
          PRONOSTICAR AHORA
        </button>
        <button className="w-full flex items-center gap-2 text-[#6b7280] text-xs px-2 py-1.5 hover:text-white transition-colors">
          <LogOut size={13} />
          CERRAR SESIÓN
        </button>
      </div>
    </aside>
  );
}
