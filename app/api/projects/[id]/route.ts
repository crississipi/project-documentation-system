import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { updateProjectSchema } from "@/lib/validations";
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  parseTags,
  serializeTags,
} from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/projects/[id] ──────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, email: true } },
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            blocks: { orderBy: { orderIndex: "asc" } },
          },
        },
        _count: { select: { sections: true } },
      },
    });

    if (!project) return notFound("Project not found.");
    if (project.authorId !== session.sub && project.visibility !== "PUBLIC") {
      return forbidden("You do not have access to this project.");
    }

    return ok({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      tags: parseTags(project.tags),
      visibility: project.visibility,
      docType: project.docType,
      paperSize: project.paperSize,
      authorId: project.authorId,
      authorName: project.author.name,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      versionNumber: project.versionNumber,
      sectionCount: project._count.sections,
      sections: project.sections.map((s) => ({
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
      })),
    });
  } catch (err) {
    console.error("[GET /api/projects/:id]", err);
    return serverError();
  }
}

// ─── PUT /api/projects/[id] ──────────────────────
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return notFound("Project not found.");
    if (project.authorId !== session.sub) return forbidden();

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...parsed.data,
        tags: parsed.data.tags ? serializeTags(parsed.data.tags) : undefined,
        versionNumber: { increment: 1 },
      },
      include: { author: { select: { name: true } }, _count: { select: { sections: true } } },
    });

    return ok({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      tags: parseTags(updated.tags),
      visibility: updated.visibility,
      docType: updated.docType,
      paperSize: updated.paperSize,
      authorId: updated.authorId,
      authorName: updated.author.name,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      versionNumber: updated.versionNumber,
      sectionCount: updated._count.sections,
    }, "Project updated");
  } catch (err) {
    console.error("[PUT /api/projects/:id]", err);
    return serverError();
  }
}

// ─── DELETE /api/projects/[id] ───────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return notFound("Project not found.");
    if (project.authorId !== session.sub) return forbidden();

    await prisma.project.delete({ where: { id } });
    return ok(null, "Project deleted successfully");
  } catch (err) {
    console.error("[DELETE /api/projects/:id]", err);
    return serverError();
  }
}

