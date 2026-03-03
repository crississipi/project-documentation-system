import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, badRequest, serverError } from "@/lib/utils";
import bcrypt from "bcryptjs";

// ─── PATCH /api/profile/password ────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return badRequest("Current password and new password are required");
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return badRequest("New password must be at least 8 characters");
    }
    if (!/[A-Z]/.test(newPassword)) {
      return badRequest("New password must contain at least one uppercase letter");
    }
    if (!/[0-9]/.test(newPassword)) {
      return badRequest("New password must contain at least one number");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { password: true },
    });
    if (!user) return unauthorized();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return badRequest("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.sub },
      data: { password: hashed },
    });

    return ok(null, "Password changed successfully");
  } catch (err) {
    console.error("[PATCH /api/profile/password]", err);
    return serverError();
  }
}
