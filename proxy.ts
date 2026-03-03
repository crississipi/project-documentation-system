import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://lightyellow-newt-377914.hostingersite.com",
  // Uncomment for local dev testing of cross-origin scenarios:
  "http://localhost:3000",
]);

function buildCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// ─── Routes that require authentication ──────────────────────────────────────
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/documentation",
  "/invite",
  "/api/projects",
  "/api/profile",
  "/api/settings",
  "/api/admin",
];

// ─── Routes that authenticated users shouldn't revisit ───────────────────────
const AUTH_ONLY_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const corsHeaders =
    origin && ALLOWED_ORIGINS.has(origin) ? buildCorsHeaders(origin) : {};

  // ── OPTIONS preflight — respond immediately with CORS headers ─────────
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // ── Never block static assets or Next internals ───────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // ── Public API routes bypass auth check entirely ──────────────────────
  if (isPublicApi(pathname)) {
    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    Object.entries(corsHeaders).forEach(([k, v]) => redirectRes.headers.set(k, v));
    return redirectRes;
  }

  // ── Authenticated user hitting login/signup — redirect to dashboard ───
  if (isAuthOnly(pathname) && isAuthenticated) {
    const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
    Object.entries(corsHeaders).forEach(([k, v]) => redirectRes.headers.set(k, v));
    return redirectRes;
  }

  // ── Pass through with CORS headers attached ───────────────────────────
  const res = NextResponse.next();
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
