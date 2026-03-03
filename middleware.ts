import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ─── Routes that require authentication ──────────────────────────────────────
const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/api/projects", "/api/profile", "/api/settings", "/api/admin"];

// ─── Routes that authenticated users shouldn't revisit ───────────────────────
const AUTH_ONLY_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

// ─── Public API routes (no auth needed) ──────────────────────────────────────
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/auth/2fa",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAuthOnly(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Never block static assets or Next internals ──────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value ?? null;
  let isAuthenticated = false;

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      await jwtVerify(token, secret);
      isAuthenticated = true;
    } catch {
      // Token invalid / expired — treat as unauthenticated
      isAuthenticated = false;
    }
  }

  // ── Unauthenticated user hitting a protected route ────────────────────
  if (isProtected(pathname) && !isAuthenticated) {
    // For API routes return 401 JSON instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated user hitting login/signup — redirect to dashboard ───
  if (isAuthOnly(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internal ones
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
