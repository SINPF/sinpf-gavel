import StatsGrid from "./statsgrid";

export default function DashboardHome() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-[2rem] leading-10 font-bold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of active matters across all categories.
        </p>
      </div>
      <StatsGrid />
    </div>
  );
}
