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
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
      {/* Yellow top bar */}
      <div className="h-1.5 bg-brand-yellow" />

      <div className="p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative h-14 w-44">
            <Image src="/sinpf-logo.png" alt="SINPF Logo" fill sizes="176px" className="object-contain" priority />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-slate-900 text-lg font-bold mb-1">Check your email</h2>
          <p className="text-slate-500 text-sm">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-brand-blue">{email || "your email"}</span>.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); submitCode(otpRef.current); }}
          className="space-y-6"
        >
          {/* OTP inputs */}
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
                  "w-11 h-12 text-center text-xl font-bold rounded-xl border transition-all",
                  "text-slate-800 focus:outline-none focus:ring-2",
                  error
                    ? "border-red-300 bg-red-50 focus:ring-red-200"
                    : digit
                    ? "border-brand-blue bg-brand-blue/5 focus:ring-brand-blue/20 focus:border-brand-blue"
                    : "border-slate-200 bg-slate-50 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white",
                ].join(" ")}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-brand-blue text-white text-sm font-semibold
              shadow-lg shadow-brand-blue/25 hover:bg-brand-blue/90 active:scale-[0.99] disabled:opacity-60
              disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & Sign In"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="text-brand-blue font-semibold hover:underline underline-offset-2 transition-all"
          >
            Resend
          </button>
        </p>
        <p className="mt-3 text-center text-sm">
          <a href="/login" className="text-slate-400 hover:text-slate-600 transition-colors">
            ← Use a different email
          </a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-10 flex justify-center items-center min-h-72">
              <span className="w-6 h-6 border-2 border-slate-200 border-t-brand-blue rounded-full animate-spin" />
            </div>
          }
        >
          <VerifyForm />
        </Suspense>
      </div>
    </div>
  );
}
