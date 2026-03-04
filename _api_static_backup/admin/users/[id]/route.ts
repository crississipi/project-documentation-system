import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/utils";
import { requireAdmin } from "@/lib/middleware/requireAdmin";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id]  — full user details + recent activity
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        isDisabled: true,
        disabledAt: true,
        avatarUrl: true,
        bio: true,
        phone: true,
        jobTitle: true,
        company: true,
        website: true,
        location: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { projects: true, sessions: true, apiKeys: true } },
      },
    });

    if (!user) return notFound("User not found.");

    // Recent projects
    const projects = await prisma.project.findMany({
      where: { authorId: id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, category: true, createdAt: true, updatedAt: true, _count: { select: { sections: true } } },
    });

    // Active sessions
    const sessions = await prisma.session.findMany({
      where: { userId: id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, expiresAt: true },
    });

    // Signup + activity per day (last 30 days) — count content saves
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentBlocks = await prisma.contentBlock.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        section: { project: { authorId: id } },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Bucket by day
    const activityMap: Record<string, number> = {};
    for (const b of recentBlocks) {
      const day = b.createdAt.toISOString().slice(0, 10);
      activityMap[day] = (activityMap[day] ?? 0) + 1;
    }
    const activitySeries = Object.entries(activityMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return ok({ user, projects, sessions, activitySeries });
  } catch (err) {
    console.error("[GET /api/admin/users/:id]", err);
    return serverError();
  }
}
