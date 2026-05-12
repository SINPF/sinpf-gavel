export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-ink relative overflow-hidden">
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right,#ffffff 1px,transparent 1px),linear-gradient(to bottom,#ffffff 1px,transparent 1px)",
          backgroundSize: "3.5rem 3.5rem",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,#000 60%,transparent 100%)",
        }}
      />

      {/* Brand glows */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-brand-blue/20 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-64 h-64 rounded-full bg-brand-yellow/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
