"use client";

import { authClient } from "@/lib/auth-client";
import { ExternalLink, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const [showLinksMenu, setShowLinksMenu] = useState(false);
  const [error, setError] = useState("");
  const [isSsoLoading, setIsSsoLoading] = useState(false);
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

  const handleMicrosoftSignIn = async () => {
    setError("");
    setIsSsoLoading(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "microsoft",
        callbackURL: "/",
      });
      if (error) {
        setError(error.message ?? "Microsoft sign-in failed.");
        setIsSsoLoading(false);
      }
      // On success, browser redirects to Microsoft; loading stays true until unmount.
    } catch {
      setError("Microsoft sign-in failed.");
      setIsSsoLoading(false);
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
            <p className="font-serif text-white/80 text-base mt-6 max-w-xs leading-relaxed">
              SINPF&apos;s legal case management and registry system.
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

            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={isSsoLoading}
              className="w-full h-11 flex items-center justify-center gap-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium
                hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSsoLoading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  {/* Microsoft brand mark — official 4-square logo, brand colors required for recognition */}
                  <svg viewBox="0 0 21 21" className="w-4 h-4" aria-hidden="true">
                    <rect x="1" y="1"   width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1"  width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11"  width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  Continue with Microsoft
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
