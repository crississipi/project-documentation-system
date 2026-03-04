import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validations";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  serverError,
  parseTags,
  serializeTags,
} from "@/lib/utils";

// ─── GET /api/projects ───────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const projects = await prisma.project.findMany({
      where: { authorId: session.sub },
      include: {
        author: { select: { name: true, email: true } },
        _count: { select: { sections: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      tags: parseTags(p.tags),
      visibility: p.visibility,
      docType: p.docType,
      paperSize: p.paperSize,
      authorId: p.authorId,
      authorName: p.author.name,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      versionNumber: p.versionNumber,
      sectionCount: p._count.sections,
    }));

    return ok(data);
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return serverError();
  }
}

// ─── POST /api/projects ──────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { title, description, category, tags, visibility, docType, paperSize } =
      parsed.data;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        category,
        tags: serializeTags(tags),
        visibility,
        docType,
        paperSize,
        authorId: session.sub,
      },
      include: {
        author: { select: { name: true } },
        _count: { select: { sections: true } },
      },
    });

    return created({
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
    }, "Project created successfully");
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return serverError();
  }
}
