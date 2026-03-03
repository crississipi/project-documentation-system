import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { sendPasswordResetEmail } from "@/lib/mail";
import { generateToken } from "@/lib/utils";
import { badRequest, ok, serverError } from "@/lib/utils";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per IP per 15 min
    const ip = getClientIp(request);
    const rl = rateLimit({ namespace: "forgot-pw", identifier: ip, limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) return tooManyRequests(rl.resetAt) as ReturnType<typeof tooManyRequests>;

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.isEmailVerified) {
      return ok(null, "If that email exists, a reset link has been sent.");
    }

    const resetToken = generateToken();
    const resetTokenExpiry = new Date(Date.now() + 3_600_000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    try {
      await sendPasswordResetEmail(email, user.name, resetToken);
    } catch (mailErr) {
      console.error("[forgot-password] email failed:", mailErr);
    }

    return ok(null, "If that email exists, a reset link has been sent.");
  } catch (err) {
    console.error("[forgot-password]", err);
    return serverError();
  }
}
