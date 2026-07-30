import StatsGrid from "./statsgrid";

export default function DashboardHome() {
  return (
    <div>
      <div className="mb-8 flex items-baseline gap-4">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of active matters across all categories.
        </p>
      </div>
      <StatsGrid />
    </div>
  );
}
