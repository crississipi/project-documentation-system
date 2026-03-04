import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/utils";
import { requireAdmin } from "@/lib/middleware/requireAdmin";

// GET /api/admin/activity — platform-wide user activity for the last 30 days
export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // New signups per day
    const signups = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // New sessions created per day (login activity)
    const logins = await prisma.session.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // New projects created per day
    const projects = await prisma.project.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Content saves (block writes) per day
    const edits = await prisma.contentBlock.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Build date range labels for last 30 days
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().slice(0, 10));
    }

    function bucket(items: { createdAt: Date }[]) {
      const map: Record<string, number> = {};
      for (const item of items) {
        const day = item.createdAt.toISOString().slice(0, 10);
        map[day] = (map[day] ?? 0) + 1;
      }
      return days.map((d) => ({ date: d, count: map[d] ?? 0 }));
    }

    return ok({
      days,
      signups: bucket(signups),
      logins: bucket(logins),
      projects: bucket(projects),
      edits: bucket(edits),
    });
  } catch (err) {
    console.error("[GET /api/admin/activity]", err);
    return serverError();
  }
}
