"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";

const OTP_LENGTH = 6;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const otpRef = useRef<string[]>(Array(OTP_LENGTH).fill(""));

  const focusInput = (i: number) => inputsRef.current[i]?.focus();

  const updateOtp = (next: string[]) => {
    otpRef.current = next;
    setOtp(next);
  };

  const handleChange = (i: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[i] = value;
    updateOtp(next);
    if (value && i < OTP_LENGTH - 1) focusInput(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) focusInput(i - 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((c, i) => { next[i] = c; });
    updateOtp(next);
    focusInput(Math.min(pasted.length - 1, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH) submitCode(next);
  };

  const submitCode = async (digits: string[]) => {
    const code = digits.join("");
    if (code.length < OTP_LENGTH) { setError("Please enter the full 6-digit code."); return; }
    setError("");
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({ email, otp: code });
      if (error) {
        setError(error.message ?? "Verification failed. Please try again.");
        updateOtp(Array(OTP_LENGTH).fill(""));
        focusInput(0);
      } else {
        router.push("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    if (error) setError(error.message ?? "Could not resend code.");
    else { updateOtp(Array(OTP_LENGTH).fill("")); focusInput(0); }
  };

  return (
    <>
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <div className="relative h-14 w-44">
          <Image src="/sinpf-logo.png" alt="SINPF Logo" fill sizes="176px" className="object-contain" priority />
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="font-serif text-foreground text-2xl font-semibold mb-1">Check your email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground tabular-nums">{email || "your email"}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); submitCode(otpRef.current); }}
        className="space-y-6 max-w-sm mx-auto w-full"
      >
        <div className="flex justify-center gap-2.5">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              title={`Digit ${i + 1} of ${OTP_LENGTH}`}
              placeholder="·"
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
              className={[
                "w-11 h-12 text-center text-xl font-semibold tabular-nums rounded-md border transition-colors",
                "text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2",
                error
                  ? "border-destructive bg-destructive/5 focus:ring-destructive"
                  : digit
                  ? "border-primary bg-accent focus:ring-ring focus:border-ring"
                  : "border-input bg-muted focus:ring-ring focus:border-ring focus:bg-background",
              ].join(" ")}
            />
          ))}
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
              Verifying…
            </>
          ) : (
            "Verify and sign in"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          className="text-primary font-medium hover:underline underline-offset-2"
        >
          Resend
        </button>
      </p>
      <p className="mt-3 text-center text-sm">
        <a href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
          ← Use a different email
        </a>
      </p>
    </>
  );
}

export default function VerifyPage() {
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
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-72">
                <span className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            <VerifyForm />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
