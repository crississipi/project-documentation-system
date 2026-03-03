import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, verifyPreAuthToken } from "@/lib/auth";
import { serverError, badRequest } from "@/lib/utils";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rateLimit";

// POST /api/auth/2fa/verify-otp
// Two use-cases:
//   1. Login flow  → body: { preAuthToken, otp }  (no auth cookie yet)
//   2. Enable 2FA  → body: { otp, enable: true }  (authenticated)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 10 OTP verify attempts per IP per 15 min
    const ip = getClientIp(request);
    const rl = rateLimit({ namespace: "otp-verify", identifier: ip, limit: 10, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) return tooManyRequests(rl.resetAt) as NextResponse;

    const body = await request.json().catch(() => ({})) as {
      preAuthToken?: string;
      otp?: string;
      enable?: boolean;
    };

    if (!body.otp) return badRequest("OTP is required");

    let userId: string | null = null;
    let loginFlow = false;

    if (body.preAuthToken) {
      // Login challenge flow — verify the signed pre-auth token
      userId = await verifyPreAuthToken(body.preAuthToken);
      if (!userId) {
        return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 });
      }
      loginFlow = true;
    } else {
      // Settings page flow — user is authenticated
      const { getSession } = await import("@/lib/auth");
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      userId = session.sub;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        otpCode: true,
        otpCodeExpiry: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Validate OTP
    if (!user.otpCode || !user.otpCodeExpiry) {
      return NextResponse.json({ success: false, error: "No OTP requested" }, { status: 400 });
    }
    if (user.otpCodeExpiry < new Date()) {
      return NextResponse.json({ success: false, error: "OTP has expired" }, { status: 400 });
    }
    if (user.otpCode !== body.otp.trim()) {
      return NextResponse.json({ success: false, error: "Invalid OTP" }, { status: 400 });
    }

    // Clear OTP from DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: null,
        otpCodeExpiry: null,
        // If called with enable: true, activate 2FA
        ...(body.enable ? { twoFactorEnabled: true } : {}),
      },
    });

    if (loginFlow) {
      // Issue JWT and set cookie
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
        sameSite: "lax",
        maxAge: parseInt(process.env.JWT_ACCESS_EXPIRES_IN ?? "86400"),
        path: "/",
      });

      return response;
    }

    // Settings enable-2FA flow — just return success
    return NextResponse.json({
      success: true,
      message: body.enable ? "2FA enabled successfully" : "OTP verified",
    });
  } catch (err) {
    console.error("[2fa/verify-otp]", err);
    return serverError();
  }
}
