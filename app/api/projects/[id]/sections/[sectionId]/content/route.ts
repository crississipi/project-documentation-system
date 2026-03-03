import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { updateContentSchema } from "@/lib/validations";
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/utils";

type Params = { params: Promise<{ id: string; sectionId: string }> };

// ─── PUT /api/projects/[id]/sections/[sectionId]/content ─
// Replace all content blocks for a section (full sync)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId, sectionId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound();

    const isOwner = project.authorId === session.sub;
    let isEditor = isOwner;

    if (!isOwner) {
      // Check if user is an accepted EDITOR collaborator
      const currentUser = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { email: true },
      });
      if (currentUser) {
        const collab = await prisma.projectCollaborator.findFirst({
          where: {
            projectId,
            invitedEmail: currentUser.email.toLowerCase(),
            status: "ACCEPTED",
            role: "EDITOR",
          },
        });
        isEditor = !!collab;
        // Mark hasEdited on first edit
        if (collab && !collab.hasEdited) {
          await prisma.projectCollaborator.update({
            where: { id: collab.id },
            data: { hasEdited: true, invitedName: collab.invitedName ?? undefined },
          });
          // Ensure invitedName is populated from user record if missing
          if (!collab.invitedName) {
            const u = await prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } });
            if (u) {
              await prisma.projectCollaborator.update({
                where: { id: collab.id },
                data: { invitedName: u.name },
              });
            }
          }
        }
      }
    }

    if (!isEditor) return forbidden();

    const section = await prisma.section.findFirst({ where: { id: sectionId, projectId } });
    if (!section) return notFound("Section not found.");

    const body = await request.json();
    const parsed = updateContentSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    // Delete existing blocks and recreate (simplest strategy for rich text sync)
    await prisma.contentBlock.deleteMany({ where: { sectionId } });

    if (parsed.data.blocks.length > 0) {
      await prisma.contentBlock.createMany({
        data: parsed.data.blocks.map((b, i) => ({
          sectionId,
          type: b.type,
          content: b.content,
          language: b.language ?? null,
          orderIndex: b.orderIndex ?? i,
        })),
      });
    }

    // Bump project version
    await prisma.project.update({
      where: { id: projectId },
      data: { versionNumber: { increment: 1 } },
    });

    const blocks = await prisma.contentBlock.findMany({
      where: { sectionId },
      orderBy: { orderIndex: "asc" },
    });

    return ok(
      blocks.map((b) => ({
        id: b.id,
        sectionId: b.sectionId,
        type: b.type,
        content: b.content,
        language: b.language,
        orderIndex: b.orderIndex,
      })),
      "Content saved"
    );
  } catch (err) {
    console.error("[PUT content]", err);
    return serverError();
  }
}

