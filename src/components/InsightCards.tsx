import { insights } from "@/lib/mock-data";

const insightBg = [
  "border-blue-500/20 bg-blue-500/5",
  "border-green-500/20 bg-green-500/5",
  "border-orange-500/20 bg-orange-500/5",
  "border-red-500/20 bg-red-500/5",
];

export default function InsightCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {insights.map((insight, idx) => (
        <div
          key={insight.id}
          className={`bg-[#1a1d26] border rounded-xl p-4 ${insightBg[idx]}`}
        >
          <div className="text-2xl mb-2">{insight.icon}</div>
          <p className="text-[#9ca3af] text-xs mb-1">{insight.title}</p>
          <p className="text-white font-bold text-sm leading-tight">{insight.value}</p>
          <p className="text-[#6b7280] text-xs mt-1">{insight.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
