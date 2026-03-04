import { prisma } from "@/lib/prisma";
import { serverError, ok } from "@/lib/utils";
import { requireAdmin } from "@/lib/middleware/requireAdmin";

// GET /api/admin/stats
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [totalUsers, verifiedUsers, totalProjects, publicProjects, totalSessions, disabledUsers] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isEmailVerified: true } }),
        prisma.project.count(),
        prisma.project.count({ where: { visibility: "PUBLIC" } }),
        prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
        prisma.user.count({ where: { isDisabled: true } }),
      ]);

    return ok({
      totalUsers,
      verifiedUsers,
      totalProjects,
      publicProjects,
      activeSessions: totalSessions,
      unverifiedUsers: totalUsers - verifiedUsers,
      disabledUsers,
    });
  } catch (err) {
    console.error("[GET /api/admin/stats]", err);
    return serverError();
  }
}
