import StatsGrid from "./statsgrid";
import AttentionTiles from "./attention-tiles";

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <StatsGrid />
      <AttentionTiles />
    </div>
  );
}
