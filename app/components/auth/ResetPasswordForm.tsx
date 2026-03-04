"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { apiFetch } from "@/lib/apiFetch";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // No token in URL — show an immediate error
  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <Image src="/logo.png" alt="OnTap Dev" width={64} height={64} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Reset Link</h1>
          <p className="text-sm text-slate-500 mb-6">
            This password reset link is missing a token. Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button className="w-full rounded-lg">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="OnTap Dev Documentation" width={64} height={64} className="mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold mb-1">Password updated!</p>
            <p className="text-sm text-slate-500 mb-5">Redirecting you to login…</p>
            <Link href="/login">
              <Button variant="secondary" className="w-full rounded-lg">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="New Password"
              type="password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirm Password"
              type="password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {serverError}
                {serverError.toLowerCase().includes("expired") || serverError.toLowerCase().includes("invalid") ? (
                  <span>
                    {" "}
                    <Link href="/forgot-password" className="underline font-semibold">
                      Request a new link
                    </Link>
                    .
                  </span>
                ) : null}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full rounded-lg">
              Reset Password
            </Button>
            <Link href="/login" className="text-center text-sm text-violet-600 hover:underline">
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
