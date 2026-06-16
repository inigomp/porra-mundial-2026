import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <Topbar />
      <BottomNav />
      <div className="flex-1 pb-20 md:pb-0">
        {children}
      </div>
    </div>
  );
}
