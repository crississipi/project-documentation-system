import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { badRequest, ok, serverError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { token, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return badRequest("Invalid or expired reset token.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return ok(null, "Password reset successfully. You can now log in.");
  } catch (err) {
    console.error("[reset-password]", err);
    return serverError();
  }
}
