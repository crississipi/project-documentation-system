import { Suspense } from "react";
import { ResetPasswordForm } from "@/app/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset Password – OnTap Dev" };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
