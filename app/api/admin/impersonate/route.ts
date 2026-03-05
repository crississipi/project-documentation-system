import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, signToken, setAuthCookie } from "@/lib/auth";
import { cookies } from "next/headers";
import {
  ok, badRequest, unauthorized, forbidden, serverError,
} from "@/lib/utils";

const ADMIN_TOKEN_COOKIE = "admin_restore_token";

// POST /api/admin/impersonate — start impersonating a user
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")
      return forbidden("Only admins can impersonate users.");
    if (session.isImpersonation)
      return badRequest("You are already in an impersonation session.");

    const body = await req.json();
    const { targetUserId } = body as { targetUserId?: string };
    if (!targetUserId) return badRequest("targetUserId is required.");

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true, isDisabled: true },
    });
    if (!target) return badRequest("Target user not found.");
    if (target.role === "SUPER_ADMIN") return forbidden("Cannot impersonate a Super Admin.");
    if (target.isDisabled) return badRequest("Cannot impersonate a disabled account.");

    // Save original admin token so we can restore it later
    const cookieStore = await cookies();
    const originalToken = cookieStore.get("auth_token")?.value;
    if (originalToken) {
      cookieStore.set(ADMIN_TOKEN_COOKIE, originalToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 3600, // 1 hour
        path: "/",
      });
    }

    // Create an impersonation JWT for the target user
    const impersonationToken = await signToken({
      sub: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      twoFactorEnabled: target.twoFactorEnabled,
      isImpersonation: true,
      impersonatorId: session.sub,
    });

    await setAuthCookie(impersonationToken);

    return ok({
      targetUser: { id: target.id, name: target.name, email: target.email },
    }, `Now impersonating ${target.name}`);
  } catch (err) {
    console.error("[POST /api/admin/impersonate]", err);
    return serverError();
  }
}

// DELETE /api/admin/impersonate — end impersonation, restore admin session
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!session.isImpersonation) return badRequest("No active impersonation session.");

    const cookieStore = await cookies();
    const restoreToken = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;
    if (!restoreToken) return badRequest("Could not restore admin session — token missing.");

    // Restore original admin token
    await setAuthCookie(restoreToken);

    // Clear the restore cookie
    cookieStore.set(ADMIN_TOKEN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 0,
      path: "/",
    });

    return ok(null, "Impersonation ended. Returned to admin session.");
  } catch (err) {
    console.error("[DELETE /api/admin/impersonate]", err);
    return serverError();
  }
}
