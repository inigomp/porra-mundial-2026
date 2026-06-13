import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import LiveBanner from "@/components/LiveBanner";
import StandingsTable from "@/components/StandingsTable";
import WinProbabilities from "@/components/WinProbabilities";
import InsightCards from "@/components/InsightCards";
import UpcomingMatches from "@/components/UpcomingMatches";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <Topbar />

      {/* Main content — offset for sidebar + topbar */}
      <main className="ml-56 mt-14 flex-1 p-6 space-y-5">
        {/* Live match */}
        <LiveBanner />

        {/* Standings + probabilities side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <StandingsTable />
          </div>
          <div className="lg:col-span-1">
            <WinProbabilities />
          </div>
        </div>

        {/* Insight cards */}
        <InsightCards />

        {/* Upcoming matches */}
        <UpcomingMatches />

        {/* Footer */}
        <footer className="border-t border-[#2a2d3a] pt-5 pb-2 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            <p className="text-white font-bold text-xs">PORRA MUNDIAL 2026</p>
            <p className="text-[#6b7280] text-xs">© 2026 Porra Mundial. Hecho con pasión por el fútbol.</p>
          </div>
          <div className="flex gap-6 text-[#6b7280] text-xs">
            <a href="#" className="hover:text-white transition-colors">TÉRMINOS DE JUEGO</a>
            <a href="#" className="hover:text-white transition-colors">PRIVACIDAD</a>
            <a href="#" className="hover:text-white transition-colors">SOPORTE</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
