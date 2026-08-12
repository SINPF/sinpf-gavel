"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isSsoLoading, setIsSsoLoading] = useState(false);

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

        </div>

        {/* Right — form panel */}
        <div className="relative flex flex-col justify-center px-10 py-12 bg-linear-to-br from-background via-blue-50 to-blue-100">
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
