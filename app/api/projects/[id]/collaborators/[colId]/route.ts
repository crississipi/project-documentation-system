import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { updateCollaboratorRoleSchema } from "@/lib/validations";
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from "@/lib/utils";

type Params = { params: Promise<{ id: string; colId: string }> };

// ─── PATCH /api/projects/[id]/collaborators/[colId] ─ update role
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: projectId, colId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { id: colId, projectId },
    });
    if (!collaborator) return notFound("Collaborator not found.");

    const body = await request.json();
    const parsed = updateCollaboratorRoleSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const updated = await prisma.projectCollaborator.update({
      where: { id: colId },
      data: { role: parsed.data.role },
    });

    return ok({
      id: updated.id,
      role: updated.role,
    });
  } catch (err) {
    console.error("[PATCH collaborator]", err);
    return serverError();
  }
}

// ─── DELETE /api/projects/[id]/collaborators/[colId] ─ remove
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: projectId, colId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const collaborator = await prisma.projectCollaborator.findFirst({
      where: { id: colId, projectId },
    });
    if (!collaborator) return notFound("Collaborator not found.");

    await prisma.projectCollaborator.delete({ where: { id: colId } });
    return ok({ id: colId });
  } catch (err) {
    console.error("[DELETE collaborator]", err);
    return serverError();
  }
}
