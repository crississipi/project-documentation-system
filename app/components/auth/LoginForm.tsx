"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations";
import { useAuth } from "@/app/context/AuthContext";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import TwoFactorModal from "@/app/components/auth/TwoFactorModal";
import type { LoginFormData } from "@/types";
import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

const UNVERIFIED_MSG = "verify your email";

// Handles credential login, optional OTP challenge, and post-login redirect.
export function LoginForm() {
  const { login, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [otpPreAuthToken, setOtpPreAuthToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");
    setResendEmail("");
    const result = await login(data.email, data.password);
    if (result.error) {
      setServerError(result.error);
      // Offer verification resend actions when login fails due to unverified email.
      if (result.error.toLowerCase().includes(UNVERIFIED_MSG)) {
        setResendEmail(data.email);
      }
      return;
    }
    // Show OTP modal when backend requires second factor before session is finalized.
    if (result.requiresOtp && result.preAuthToken) {
      setOtpPreAuthToken(result.preAuthToken);
      return;
    }
    router.push(redirect);
  };

  const handleResend = async () => {
    if (!resendEmail || resendStatus === "sending") return;
    setResendStatus("sending");
    await apiFetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: resendEmail }),
    });
    setResendStatus("sent");
  };

  return (
    <>
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-violet-100 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full translate-x-1/2 translate-y-1/2 opacity-40 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo.png" alt="OnTap Dev Documentation" width={72} height={72} className="mb-3" />
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-violet-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {serverError && (
              // Login error box can include email verification recovery actions.
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {serverError}
                {resendEmail && (
                  <div className="mt-2 pt-2 border-t border-red-200 flex flex-wrap items-center gap-2">
                    {resendStatus === "sent" ? (
                      <span className="text-green-700 font-medium">✓ New PIN sent — check your inbox.</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={resendStatus === "sending"}
                          className="underline font-medium hover:text-red-900 disabled:opacity-50"
                        >
                          {resendStatus === "sending" ? "Sending…" : "Resend verification PIN"}
                        </button>
                        <span className="text-red-400">·</span>
                        <Link
                          href={`/verify-email?email=${encodeURIComponent(resendEmail)}`}
                          className="underline font-medium hover:text-red-900"
                        >
                          Enter PIN
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="mt-2 w-full rounded-lg">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-violet-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* 2FA OTP modal — shown when login requires OTP */}
      {otpPreAuthToken && (
        <TwoFactorModal
          preAuthToken={otpPreAuthToken}
          onVerified={async () => {
            setOtpPreAuthToken(null);
            await refresh();
            router.push(redirect);
          }}
          onClose={() => setOtpPreAuthToken(null)}
        />
      )}
    </>
  );
}
