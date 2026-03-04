import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serverError, unauthorized, badRequest } from "@/lib/utils";

// POST /api/auth/2fa/disable
// Body: { password: string }  — requires current password confirmation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await request.json().catch(() => ({})) as { password?: string };
    if (!body.password) return badRequest("Password is required to disable 2FA");

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, password: true },
    });
    if (!user) return unauthorized();

    const match = await bcrypt.compare(body.password, user.password);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.sub },
      data: { twoFactorEnabled: false, otpCode: null, otpCodeExpiry: null },
    });

    return NextResponse.json({ success: true, message: "2FA disabled successfully" });
  } catch (err) {
    console.error("[2fa/disable]", err);
    return serverError();
  }
}
