import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/utils";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "week";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const todayStart = startOfDay(now);

    let fromDate: Date;
    let toDate: Date;
    let granularity: "hour" | "day";

    if (range === "yesterday") {
      fromDate = startOfDay(addDays(todayStart, -1));
      toDate = todayStart;
      granularity = "hour";
    } else if (range === "week") {
      fromDate = addDays(todayStart, -6);
      toDate = addDays(todayStart, 1);
      granularity = "day";
    } else if (range === "month") {
      fromDate = addDays(todayStart, -29);
      toDate = addDays(todayStart, 1);
      granularity = "day";
    } else if (range === "custom" && fromParam && toParam) {
      fromDate = new Date(fromParam);
      toDate = addDays(new Date(toParam), 1);
      const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
      granularity = diffDays <= 2 ? "hour" : "day";
    } else {
      // default: last 7 days
      fromDate = addDays(todayStart, -6);
      toDate = addDays(todayStart, 1);
      granularity = "day";
    }

    // Fetch all content blocks saved in the range (createdAt = when the save happened)
    const blocks = await prisma.contentBlock.findMany({
      where: {
        createdAt: { gte: fromDate, lt: toDate },
        section: {
          project: {
            OR: [
              { authorId: session.sub },
              {
                collaborators: {
                  some: { userId: session.sub, status: "ACCEPTED" },
                },
              },
            ],
          },
        },
      },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // ── Timeline buckets ──────────────────────────────────────────────────────
    const timelineMap = new Map<string, { label: string; saves: number; words: number; chars: number }>();

    if (granularity === "hour") {
      // 24 hourly buckets for the from-day
      for (let h = 0; h < 24; h++) {
        const key = String(h);
        timelineMap.set(key, { label: fmtHour(h), saves: 0, words: 0, chars: 0 });
      }
      for (const b of blocks) {
        const key = String(b.createdAt.getHours());
        const bucket = timelineMap.get(key)!;
        bucket.saves++;
        const text = stripHtml(b.content);
        bucket.words += text.split(/\s+/).filter(Boolean).length;
        bucket.chars += text.length;
      }
    } else {
      // Daily buckets
      const cursor = new Date(fromDate);
      while (cursor < toDate) {
        const key = cursor.toISOString().slice(0, 10);
        timelineMap.set(key, { label: fmtDate(new Date(cursor)), saves: 0, words: 0, chars: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
      for (const b of blocks) {
        const key = b.createdAt.toISOString().slice(0, 10);
        const bucket = timelineMap.get(key);
        if (!bucket) continue;
        bucket.saves++;
        const text = stripHtml(b.content);
        bucket.words += text.split(/\s+/).filter(Boolean).length;
        bucket.chars += text.length;
      }
    }

    const timeline = Array.from(timelineMap.values());

    // ── Per-project breakdown ─────────────────────────────────────────────────
    const projectMap = new Map<string, { name: string; saves: number; words: number; sections: Set<string> }>();
    for (const b of blocks) {
      const pid = b.section.project.id;
      if (!projectMap.has(pid)) {
        projectMap.set(pid, { name: b.section.project.title, saves: 0, words: 0, sections: new Set() });
      }
      const p = projectMap.get(pid)!;
      p.saves++;
      p.sections.add(b.section.id);
      p.words += stripHtml(b.content).split(/\s+/).filter(Boolean).length;
    }
    const byProject = Array.from(projectMap.values())
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 8)
      .map(({ name, saves, words, sections }) => ({ name, saves, words, sections: sections.size }));

    // ── Hourly activity heatmap (hour 0-23 across all time) ───────────────────
    const hourMap: number[] = Array(24).fill(0);
    for (const b of blocks) hourMap[b.createdAt.getHours()]++;
    const hourlyHeatmap = hourMap.map((count, h) => ({ hour: fmtHour(h), count }));

    // ── Summary stats ─────────────────────────────────────────────────────────
    const totalSaves = blocks.length;
    const totalWords = blocks.reduce((sum, b) => sum + stripHtml(b.content).split(/\s+/).filter(Boolean).length, 0);
    const activeDays = new Set(blocks.map((b) => b.createdAt.toISOString().slice(0, 10))).size;
    const peakHour = hourMap.indexOf(Math.max(...hourMap));

    return ok({
      timeline,
      byProject,
      hourlyHeatmap,
      summary: {
        totalSaves,
        totalWords,
        activeDays,
        peakHour: totalSaves > 0 ? fmtHour(peakHour) : null,
        granularity,
        range,
      },
    });
  } catch (err) {
    console.error("[GET activity]", err);
    return serverError();
  }
}
