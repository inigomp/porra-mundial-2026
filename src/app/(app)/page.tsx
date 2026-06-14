import StandingsTable from "@/components/StandingsTable";
import LeaderboardCards from "@/components/LeaderboardCards";
import UpcomingMatches from "@/components/UpcomingMatches";
import LiveBanner from "@/components/LiveBanner";

export default function Home() {
  return (
    <main className="md:ml-56 mt-14 flex-1 p-4 md:p-6 space-y-5">
        {/* Live match */}
        <LiveBanner />

        {/* Standings + probabilities side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <StandingsTable />
          </div>
          <div className="lg:col-span-1">
            <LeaderboardCards />
          </div>
        </div>

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
  );
}
