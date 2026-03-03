import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mail";
import { generatePin, badRequest, ok, serverError } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return badRequest("Valid email is required.");

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return ok(null, "If that email exists and is unverified, a new PIN has been sent.");
    }

    const pin = generatePin();
    const expiry = new Date(
      Date.now() + parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_MS ?? "86400000")
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: pin, verificationTokenExpiry: expiry },
    });

    try {
      await sendVerificationEmail(email, user.name, pin);
    } catch (err) {
      console.error("[resend-verification] mail error:", err);
    }

    return ok(null, "A new verification PIN has been sent to your email.");
  } catch (err) {
    console.error("[resend-verification]", err);
    return serverError();
  }
}
