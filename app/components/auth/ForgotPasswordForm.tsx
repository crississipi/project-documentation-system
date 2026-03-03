"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/validations";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { useState } from "react";
import { z } from "zod";

type FormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Something went wrong"); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="OnTap Dev Documentation" width={64} height={64} className="mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-slate-600 text-sm mb-4">
              If that email is registered, a reset link has been sent. Check your inbox.
            </p>
            <Link href="/login">
              <Button variant="secondary" className="w-full rounded-lg">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Email Address" type="email" error={errors.email?.message} {...register("email")} />
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{serverError}</div>
            )}
            <Button type="submit" loading={isSubmitting} className="w-full rounded-lg">Send Reset Link</Button>
            <Link href="/login" className="text-center text-sm text-violet-600 hover:underline">Back to Login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
