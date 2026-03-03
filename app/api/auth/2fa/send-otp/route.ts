import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { serverError } from "@/lib/utils";
import { sendOtpEmail } from "@/lib/mail";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rateLimit";
import { verifyPreAuthToken } from "@/lib/auth";

// Generate a cryptographically secure 6-digit OTP
function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

// POST /api/auth/2fa/send-otp
// Body: { preAuthToken: string }  — called before JWT is issued, from the login 2FA challenge
// OR called from the settings page (authenticated) with no body → uses session
export async function POST(request: NextRequest) {
  try {
    // IP rate limit: max 10 OTP sends per 15 min per IP
    const ip = getClientIp(request);
    const ipRl = rateLimit({ namespace: "otp-send", identifier: ip, limit: 10, windowMs: 15 * 60 * 1000 });
    if (!ipRl.allowed) return tooManyRequests(ipRl.resetAt) as NextResponse;

    const body = await request.json().catch(() => ({}));

    let userId: string | null = null;

    // Settings page use-case: authenticated, no preAuthToken in body
    if (!body.preAuthToken) {
      const { getSession } = await import("@/lib/auth");
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      userId = session.sub;
    } else {
      // Login-challenge flow: verify the signed pre-auth token
      userId = await verifyPreAuthToken(body.preAuthToken as string);
      if (!userId) {
        return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, otpCodeExpiry: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Rate-limit: only resend after 60 s
    if (user.otpCodeExpiry && user.otpCodeExpiry.getTime() - Date.now() > 9 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: "Please wait before requesting a new code" },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: userId },
      data: { otpCode: otp, otpCodeExpiry: expiry },
    });

    await sendOtpEmail(user.email, user.name, otp);

    return NextResponse.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("[2fa/send-otp]", err);
    return serverError();
  }
}
