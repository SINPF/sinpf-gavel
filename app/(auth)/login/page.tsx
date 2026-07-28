"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

          {/* Branding text */}
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <p className="text-highlight text-[11px] font-semibold tracking-[0.06em] uppercase mb-2">
              SINPF Legal &amp; Registry System
            </p>
            <h1 className="font-serif text-white text-4xl font-bold tracking-tight leading-snug">
              Gavel
            </h1>
            <p className="text-white/60 text-xs mt-3 leading-relaxed">
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

          <p className="text-center text-muted-foreground text-sm mb-8">
            Welcome back. Sign in to Gavel.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="max-w-sm mx-auto w-full space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@sinpf.org.sb"
                  required
                  autoComplete="email"
                  className={`w-full px-3 py-2 rounded-md border text-sm text-foreground bg-background
                    placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                    ${error
                      ? "border-destructive focus:ring-destructive focus:border-destructive"
                      : "border-input focus:ring-ring focus:border-ring"
                    }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`w-full px-3 py-2 rounded-md border text-sm text-foreground bg-background
                    placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                    ${error
                      ? "border-destructive focus:ring-destructive focus:border-destructive"
                      : "border-input focus:ring-ring focus:border-ring"
                    }`}
                />
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
