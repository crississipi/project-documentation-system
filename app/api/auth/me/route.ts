import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, serverError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user) return unauthorized();

    // Include impersonation context from JWT if present
    const responseData = {
      ...user,
      ...(session.isImpersonation
        ? {
            isImpersonation: true,
            impersonatorId: session.impersonatorId,
          }
        : {}),
    };

    return ok(responseData);
  } catch (err) {
    console.error("[me]", err);
    return serverError();
  }
}
