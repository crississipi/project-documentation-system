import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { updateSectionSchema } from "@/lib/validations";
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/utils";

type Params = { params: Promise<{ id: string; sectionId: string }> };

// ─── GET /api/projects/[id]/sections/[sectionId] ─
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId, sectionId } = await params;

    const section = await prisma.section.findFirst({
      where: { id: sectionId, projectId },
      include: { blocks: { orderBy: { orderIndex: "asc" } } },
    });
    if (!section) return notFound("Section not found.");

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound();
    if (project.authorId !== session.sub && project.visibility !== "PUBLIC") return forbidden();

    return ok({
      id: section.id,
      projectId: section.projectId,
      title: section.title,
      orderIndex: section.orderIndex,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
      blocks: section.blocks.map((b) => ({
        id: b.id,
        sectionId: b.sectionId,
        type: b.type,
        content: b.content,
        language: b.language,
        orderIndex: b.orderIndex,
      })),
    });
  } catch (err) {
    console.error("[GET section]", err);
    return serverError();
  }
}

// ─── PUT /api/projects/[id]/sections/[sectionId] ─
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId, sectionId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const section = await prisma.section.findFirst({ where: { id: sectionId, projectId } });
    if (!section) return notFound("Section not found.");

    const body = await request.json();
    const parsed = updateSectionSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: parsed.data,
      include: { blocks: { orderBy: { orderIndex: "asc" } } },
    });

    return ok({
      id: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      orderIndex: updated.orderIndex,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      blocks: updated.blocks.map((b) => ({
        id: b.id,
        sectionId: b.sectionId,
        type: b.type,
        content: b.content,
        language: b.language,
        orderIndex: b.orderIndex,
      })),
    }, "Section updated");
  } catch (err) {
    console.error("[PUT section]", err);
    return serverError();
  }
}

// ─── DELETE /api/projects/[id]/sections/[sectionId] ─
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId, sectionId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const section = await prisma.section.findFirst({ where: { id: sectionId, projectId } });
    if (!section) return notFound("Section not found.");

    await prisma.section.delete({ where: { id: sectionId } });

    // Re-order remaining sections
    const remaining = await prisma.section.findMany({
      where: { projectId },
      orderBy: { orderIndex: "asc" },
    });
    await Promise.all(
      remaining.map((s, i) =>
        prisma.section.update({ where: { id: s.id }, data: { orderIndex: i } })
      )
    );

    return ok(null, "Section deleted");
  } catch (err) {
    console.error("[DELETE section]", err);
    return serverError();
  }
}

