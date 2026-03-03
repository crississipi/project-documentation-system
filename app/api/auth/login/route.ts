import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { signToken, signPreAuthToken } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/utils";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rateLimit";

// ─── Lockout policy ───────────────────────────────────────────────────────────
const MAX_ATTEMPTS  = 5;           // lock after 5 consecutive failures
const LOCKOUT_MS    = 15 * 60 * 1000; // 15-minute lockout
// IP-level: max 20 attempts per 15 min from any single IP
const IP_LIMIT      = 20;
const IP_WINDOW_MS  = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    // ── 1) IP-level rate limit ────────────────────────────────────────────
    const ip = getClientIp(request);
    const ipCheck = rateLimit({
      namespace: "login-ip",
      identifier: ip,
      limit: IP_LIMIT,
      windowMs: IP_WINDOW_MS,
    });
    if (!ipCheck.allowed) return tooManyRequests(ipCheck.resetAt) as NextResponse;

    // ── 2) Parse & validate body ──────────────────────────────────────────
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { email, password } = parsed.data;

    // ── 3) Per-email rate limit (prevents enumeration-assisted brute force) ─
    const emailCheck = rateLimit({
      namespace: "login-email",
      identifier: email.toLowerCase(),
      limit: IP_LIMIT,
      windowMs: IP_WINDOW_MS,
    });
    if (!emailCheck.allowed) return tooManyRequests(emailCheck.resetAt) as NextResponse;

    // ── 4) Fetch user ─────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({ where: { email } });

    // Constant-time rejection even for unknown emails (mitigate timing attacks)
    if (!user) {
      await bcrypt.compare(password, "$2b$12$invalidhashfortimingmitigationonly000000000000000000");
      return unauthorized("Invalid email or password.");
    }

    // ── 5) Account lockout check ──────────────────────────────────────────
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, error: `Account temporarily locked. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).` },
        { status: 423, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    // ── 6) Password check ─────────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock  = newAttempts >= MAX_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null,
        },
      });
      if (shouldLock) {
        return NextResponse.json(
          { success: false, error: `Too many failed attempts. Account locked for 15 minutes.` },
          { status: 423 }
        );
      }
      return unauthorized("Invalid email or password.");
    }

    // ── 7) Email verification guard ───────────────────────────────────────
    if (!user.isEmailVerified) {
      return unauthorized("Please verify your email address before logging in.");
    }

    // ── 8) Reset lockout counters on success ──────────────────────────────
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // ── 9) 2FA check — issue pre-auth token instead of raw userId ──────────
    if (user.twoFactorEnabled) {
      const preAuthToken = await signPreAuthToken(user.id);
      return NextResponse.json(
        { success: true, requiresOtp: true, preAuthToken },
        { status: 200 }
      );
    }

    // ── 10) Sign JWT ──────────────────────────────────────────────────────
    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          isEmailVerified: user.isEmailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        },
      },
      { status: 200 }
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: parseInt(process.env.JWT_ACCESS_EXPIRES_IN ?? "86400"),
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[login]", err);
    return serverError();
  }
}
