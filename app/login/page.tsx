import { LoginForm } from "@/app/components/auth/LoginForm";
import { Suspense } from "react";

export const metadata = { title: "Sign In – OnTap Dev" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
