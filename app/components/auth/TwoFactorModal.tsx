"use client";

import { useEffect, useRef, useState } from "react";
import { BiShield, BiX, BiEnvelope, BiLock } from "react-icons/bi";
import { apiFetch } from "@/lib/apiFetch";

// ── 2FA Modal: used in two scenarios ──────────────────────────────────────────
// 1. Login flow:   show when login returns { requiresOtp: true, preAuthToken }
//                  onVerified(userData) is called with the full user data
// 2. Settings:     show to verify OTP during Enable 2FA setup
//                  enable=true, onVerified() called with no args

export interface TwoFactorModalProps {
  /** The preAuthToken (signed JWT) when coming from the login flow (not authenticated yet) */
  preAuthToken?: string;
  /** When true, verifying also flips twoFactorEnabled on the user */
  enable?: boolean;
  onVerified: (data?: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function TwoFactorModal({
  preAuthToken,
  enable,
  onVerified,
  onClose,
}: TwoFactorModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const joined = otp.join("");

  const handleChange = (index: number, value: string) => {
    // Accept only digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    // Auto-advance focus
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) {
      next[i] = text[i] ?? "";
    }
    setOtp(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
    e.preventDefault();
  };

  const handleVerify = async () => {
    if (joined.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/2fa/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(preAuthToken ? { preAuthToken } : {}),
          otp: joined,
          ...(enable ? { enable: true } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Invalid code");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        onVerified(json.data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const res = await apiFetch("/api/auth/2fa/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preAuthToken ? { preAuthToken } : {}),
      });
      if (res.ok) {
        setResendCooldown(60);
      } else {
        const json = await res.json();
        setError(json.error ?? "Failed to resend");
      }
    } catch {
      setError("Network error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="2fa-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm mx-4 relative">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <BiX className="text-lg" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-3">
            <BiShield className="text-3xl text-violet-600" />
          </div>
          <h2 id="2fa-title" className="text-lg font-bold text-slate-900">
            Two-Factor Verification
          </h2>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Enter the 6-digit code sent to your email address.
          </p>
        </div>

        {/* OTP inputs */}
        <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              className={`w-10 h-12 text-center text-lg font-bold border-2 rounded-xl outline-none transition-colors
                ${error ? "border-red-400 bg-red-50" : "border-slate-200"}
                focus:border-violet-500 focus:bg-violet-50`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 text-center mb-4 flex items-center justify-center gap-1">
            <BiX /> {error}
          </p>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || joined.length < 6}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying…</>
          ) : (
            <><BiLock /> Verify Code</>
          )}
        </button>

        {/* Resend */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 mb-1">
            <BiEnvelope className="inline mr-1" />
            Didn&apos;t receive a code?
          </p>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}
