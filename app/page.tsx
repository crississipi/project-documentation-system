import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
);

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      redirect("/dashboard");
    } catch {
      // invalid token, fall through to login
    }
  }

  redirect("/login");
}
