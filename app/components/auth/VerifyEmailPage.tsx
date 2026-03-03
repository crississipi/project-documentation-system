"use client";

import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/app/components/ui/Button";

const PIN_LENGTH = 6;

export function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pin = digits.join("");

  // ─── Focus helpers ───────────────────────────────
  const focusAt = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, PIN_LENGTH - 1))]?.focus();
  };

  // ─── Handle single-box input ─────────────────────
  const handleChange = (index: number, value: string) => {
    const char = value.replace(/[^A-Za-z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < PIN_LENGTH - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        focusAt(index - 1);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      focusAt(index + 1);
    } else if (e.key === "Enter" && pin.length === PIN_LENGTH) {
      handleSubmit();
    }
  };

  // ─── Paste support ───────────────────────────────
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const next = Array(PIN_LENGTH).fill("");
    for (let i = 0; i < PIN_LENGTH && i < text.length; i++) next[i] = text[i];
    setDigits(next);
    focusAt(Math.min(text.length, PIN_LENGTH - 1));
  };

  // ─── Submit ──────────────────────────────────────
  const handleSubmit = async () => {
    if (pin.length < PIN_LENGTH) return;
    setStatus("loading");
    setMessage("");

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: pin }),
    });
    const json = await res.json();

    if (res.ok) {
      setStatus("success");
      setMessage(json.message ?? "Email verified successfully!");
    } else {
      setStatus("error");
      setMessage(json.error ?? "Verification failed. Please try again.");
      setDigits(Array(PIN_LENGTH).fill(""));
      setTimeout(() => focusAt(0), 50);
    }
  };

  // ─── Success screen ──────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <Image src="/logo.png" alt="OnTap Dev Documentation" width={64} height={64} className="mx-auto mb-4" />
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Email Verified!</h2>
          <p className="text-slate-500 text-sm mb-6">{message}</p>
          <Button onClick={() => router.push("/login")} className="w-full rounded-lg">
            Continue to Login
          </Button>
        </div>
      </div>
    );
  }

  // ─── PIN entry screen ────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-100 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full translate-x-1/2 translate-y-1/2 opacity-40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10 text-center">
        <Image src="/logo.png" alt="OnTap Dev Documentation" width={64} height={64} className="mx-auto mb-4" />

        {/* Icon */}
        <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
        <p className="text-sm text-slate-500 mb-1">
          We&apos;ve sent a 6-character PIN to
        </p>
        {email ? (
          <p className="text-sm font-semibold text-violet-700 mb-6 truncate">{email}</p>
        ) : (
          <p className="text-sm text-slate-400 mb-6">your email address</p>
        )}

        {/* PIN boxes */}
        <div className="flex gap-2 justify-center mb-6">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="text"
              maxLength={2}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              autoFocus={i === 0}
              className={[
                "w-12 h-14 text-center text-xl font-bold uppercase rounded-xl border-2 outline-none transition-all duration-150",
                "bg-slate-50 text-slate-900 tracking-widest",
                digit
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-200 focus:border-violet-400 focus:bg-white",
                status === "error" ? "!border-red-400 !bg-red-50" : "",
              ].filter(Boolean).join(" ")}
            />
          ))}
        </div>

        {/* Error message */}
        {status === "error" && message && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4 text-left">
            {message}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          loading={status === "loading"}
          disabled={pin.length < PIN_LENGTH || status === "loading"}
          className="w-full rounded-lg mb-4"
        >
          Verify Email
        </Button>

        <p className="text-xs text-slate-400">
          Didn&apos;t receive it?{" "}
          <Link href="/signup" className="text-violet-600 font-medium hover:underline">
            Register again
          </Link>
          {" "}or check your spam folder.
        </p>
      </div>
    </div>
  );
}
