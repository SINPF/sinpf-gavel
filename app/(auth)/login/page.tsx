"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [isMsLoading, setIsMsLoading] = useState(false);

  const handleMicrosoftSignIn = async () => {
    setIsMsLoading(true);
    await authClient.signIn.social({ provider: "microsoft", callbackURL: "/" });
    setIsMsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        setError(error.message ?? "Something went wrong. Please try again.");
      } else {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
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
          <div className="absolute inset-0 bg-linear-to-t from-brand-ink/95 via-brand-ink/50 to-brand-ink/20" />

          {/* Branding text */}
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <p className="text-brand-yellow text-[10px] font-black tracking-[0.25em] uppercase mb-2">
              SINPF Legal & Registry System
            </p>
            <h1 className="text-white text-3xl font-bold tracking-tight leading-snug">
              Gavel
            </h1>
            <p className="text-white/50 text-xs mt-3 leading-relaxed">
              Solomon Islands National Provident Fund
            </p>
          </div>
        </div>

        {/* Right — form panel */}
        <div className="bg-white flex flex-col justify-center px-10 py-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative h-14 w-44">
              <Image
                src="/sinpf-logo.png"
                alt="SINPF Logo"
                fill
                sizes="176px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mb-8">
            Welcome back. Sign in to Gavel.
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <div className="max-w-sm mx-auto w-full space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-[11px] font-black text-slate-500 uppercase tracking-widest"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@sinpf.org.sb"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium text-slate-800 bg-slate-50
                    placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all
                    ${error
                      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                      : "border-slate-200 focus:ring-brand-blue/20 focus:border-brand-blue"
                    }`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isMsLoading}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-brand-blue text-white text-sm font-semibold
                  shadow-lg shadow-brand-blue/25 hover:bg-brand-blue/90 active:scale-[0.99] disabled:opacity-60
                  disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Send One-Time Code"
                )}
              </button>
            </form>

            {/* Separator */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Microsoft sign-in */}
            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={isLoading || isMsLoading}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl bg-slate-700
                text-white text-sm font-semibold hover:bg-slate-600 active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isMsLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
              )}
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
