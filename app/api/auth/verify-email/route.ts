import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailSchema } from "@/lib/validations";
import { badRequest, ok, serverError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Verification token is required.");
    }

    const { token } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { verificationToken: token.toUpperCase() },
    });

    if (!user) {
      return badRequest("Invalid or expired PIN. Please check your email and try again.");
    }

    if (user.isEmailVerified) {
      return ok(null, "Email is already verified. Please log in.");
    }

    if (
      user.verificationTokenExpiry &&
      new Date() > user.verificationTokenExpiry
    ) {
      return badRequest("This PIN has expired. Please register again.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return ok(null, "Email verified successfully! You can now log in.");
  } catch (err) {
    console.error("[verify-email]", err);
    return serverError();
  }
}


