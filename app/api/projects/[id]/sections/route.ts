import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createSectionSchema } from "@/lib/validations";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/projects/[id]/sections ────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound("Project not found.");
    if (project.authorId !== session.sub && project.visibility !== "PUBLIC") {
      return forbidden();
    }

    const sections = await prisma.section.findMany({
      where: { projectId },
      orderBy: { orderIndex: "asc" },
      include: { blocks: { orderBy: { orderIndex: "asc" } } },
    });

    return ok(
      sections.map((s) => ({
        id: s.id,
        projectId: s.projectId,
        title: s.title,
        orderIndex: s.orderIndex,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        blocks: s.blocks.map((b) => ({
          id: b.id,
          sectionId: b.sectionId,
          type: b.type,
          content: b.content,
          language: b.language,
          orderIndex: b.orderIndex,
        })),
      }))
    );
  } catch (err) {
    console.error("[GET sections]", err);
    return serverError();
  }
}

// ─── POST /api/projects/[id]/sections ───────────
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound("Project not found.");
    if (project.authorId !== session.sub) return forbidden();

    const body = await request.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    // Auto-assign order index if not provided
    const maxOrder = await prisma.section.findFirst({
      where: { projectId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const newIndex = parsed.data.orderIndex ?? (maxOrder ? maxOrder.orderIndex + 1 : 0);

    const section = await prisma.section.create({
      data: {
        projectId,
        title: parsed.data.title,
        orderIndex: newIndex,
      },
      include: { blocks: true },
    });

    // Bump project version
    await prisma.project.update({
      where: { id: projectId },
      data: { versionNumber: { increment: 1 } },
    });

    return created({
      id: section.id,
      projectId: section.projectId,
      title: section.title,
      orderIndex: section.orderIndex,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
      blocks: [],
    }, "Section created");
  } catch (err) {
    console.error("[POST sections]", err);
    return serverError();
  }
}


