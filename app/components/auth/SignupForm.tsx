"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/lib/validations";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import type { SignupFormData } from "@/types";
import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

// Creates a new account, then routes users into the email verification flow.
export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [conflictEmail, setConflictEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError("");
    setConflictEmail("");
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      // 409 means account exists; guide user to sign in or verify instead.
      if (res.status === 409) {
        setConflictEmail(data.email);
      } else {
        setServerError(json.error ?? "Registration failed");
      }
      return;
    }
    // Registration success still requires PIN verification before full access.
    router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-100 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full translate-x-1/2 translate-y-1/2 opacity-40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="OnTap Dev Documentation" width={72} height={72} className="mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Start documenting your projects today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Full Name" type="text" autoComplete="name" error={errors.name?.message} {...register("name")} />
          <Input label="Email Address" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Input label="Password" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
          <Input label="Confirm Password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {conflictEmail && (
            // Recovery path for already-registered emails.
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              An account with that email already exists.
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/login" className="underline font-medium hover:text-amber-900">
                  Sign in
                </Link>
                <span className="text-amber-400">·</span>
                <Link
                  href={`/verify-email?email=${encodeURIComponent(conflictEmail)}`}
                  className="underline font-medium hover:text-amber-900"
                >
                  Verify email instead
                </Link>
              </div>
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full rounded-lg">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
