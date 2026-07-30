"use client";

import { authClient } from "@/lib/auth-client";
import { ExternalLink, Eye, EyeOff, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showLinksMenu, setShowLinksMenu] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const linksMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLinksMenu) return;
    const onDown = (e: MouseEvent) => {
      if (linksMenuRef.current && !linksMenuRef.current.contains(e.target as Node)) {
        setShowLinksMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLinksMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showLinksMenu]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });
      if (error) {
        setError(error.message ?? "Invalid email or password.");
      } else {
        router.push("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">

        {/* Left — video panel */}
        <div className="relative hidden lg:flex">
          <video
            autoPlay
            muted
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/gavel.mp4" type="video/mp4" />
          </video>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-sinpf-navy/95 via-sinpf-navy/50 to-sinpf-navy/20" />

          {/* Branding */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
            <div className="relative h-14 w-44 mb-6">
              <Image
                src="/sinpf-logo.png"
                alt="SINPF Logo"
                fill
                sizes="176px"
                className="object-contain"
                priority
              />
            </div>
            <h1 className="font-serif text-white text-5xl font-bold tracking-tight leading-none">
              Gavel
            </h1>
            <span className="mt-6 h-px w-12 bg-highlight" aria-hidden="true" />
            <p className="font-serif text-white/80 text-base mt-5 max-w-xs leading-relaxed">
              SINPF&apos;s legal case management system.
            </p>
          </div>

          {/* Copyright */}
          <p className="absolute bottom-0 left-0 p-6 text-white/60 text-xs">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://sinpf.org.sb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline-offset-2 hover:underline transition-colors"
            >
              SINPF
            </a>
          </p>

          <p className="absolute bottom-0 right-0 p-6 text-white/60 text-xs">
            Honiara, Solomon Islands
          </p>
        </div>

        {/* Right — form panel */}
        <div className="relative flex flex-col justify-center px-10 py-12 bg-linear-to-br from-background via-blue-50 to-blue-100">
          {/* External links menu */}
          <div ref={linksMenuRef} className="absolute top-6 right-6">
            <button
              type="button"
              onClick={() => setShowLinksMenu((v) => !v)}
              aria-label="Open external links"
              aria-haspopup="menu"
              aria-expanded={showLinksMenu}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2
                transition-colors"
            >
              <LayoutGrid className="w-5 h-5" aria-hidden="true" />
            </button>

            {showLinksMenu && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 min-w-40 rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden z-10"
              >
                <a
                  href="https://sinpf.org.sb"
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setShowLinksMenu(false)}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Website
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </a>
                <a
                  href="https://sinpfportal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setShowLinksMenu(false)}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Portal
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>

          <div className="max-w-sm mx-auto w-full space-y-5">
            <p className="text-muted-foreground text-sm mb-6 pb-4 border-b">
              Welcome back. Sign in to Gavel.
            </p>

            {error && (
              <div className="mb-5 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@sinpf.org.sb"
                required
                autoComplete="email"
                aria-label="Email address"
                className={`w-full h-12 px-3 rounded-t-md border-b text-sm text-foreground bg-background
                  placeholder:text-muted-foreground/60 focus:outline-none transition-colors
                  ${error ? "border-destructive" : "border-input focus:border-highlight"}`}
              />

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  aria-label="Password"
                  className={`w-full h-12 pl-3 pr-10 rounded-t-md border-b text-sm text-foreground bg-background
                    placeholder:text-muted-foreground/60 focus:outline-none transition-colors
                    ${error ? "border-destructive" : "border-input focus:border-highlight"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-10 rounded-tr-md
                    text-muted-foreground hover:text-foreground
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium
                  hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
