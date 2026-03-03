import { VerifyEmailPage } from "@/app/components/auth/VerifyEmailPage";
import { Suspense } from "react";

export const metadata = { title: "Verify Email – OnTap Dev" };

export default function VerifyEmail() {
  return (
    <Suspense>
      <VerifyEmailPage />
    </Suspense>
  );
}
