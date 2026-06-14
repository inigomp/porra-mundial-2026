"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, BarChart3, Radio } from "lucide-react";

const navItems = [
  { href: "/", label: "Tablero", icon: LayoutDashboard },
  { href: "/predicciones", label: "Pred.", icon: ListChecks },
  { href: "/clasificacion", label: "Clasif.", icon: BarChart3 },
  { href: "/directo", label: "En Vivo", icon: Radio },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#13151f] border-t border-[#2a2d3a] flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] text-[10px] font-semibold tracking-wide transition-colors ${
              active ? "text-[#00c853]" : "text-[#6b7280]"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
