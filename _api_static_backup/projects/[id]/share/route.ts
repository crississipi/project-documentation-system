import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, unauthorized, forbidden, notFound, serverError } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/projects/[id]/share ── get existing shared link ──────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { authorId: true },
    });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const link = await prisma.sharedLink.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return ok(
      link
        ? {
            token: link.token,
            canEdit: link.canEdit,
            canComment: link.canComment,
            canDownload: link.canDownload,
            expiresAt: link.expiresAt?.toISOString() ?? null,
            createdAt: link.createdAt.toISOString(),
          }
        : null
    );
  } catch (err) {
    console.error("[GET share link]", err);
    return serverError();
  }
}

// ── POST /api/projects/[id]/share ── create / replace shared link ─────────────
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { authorId: true },
    });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const body = await request.json().catch(() => ({}));
    const { canEdit = false, canComment = false, canDownload = false, expiresInDays } = body;

    // Delete any existing shared link for this project first
    await prisma.sharedLink.deleteMany({ where: { projectId } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = expiresInDays
      ? new Date(Date.now() + (expiresInDays as number) * 24 * 60 * 60 * 1000)
      : null;

    const link = await prisma.sharedLink.create({
      data: {
        projectId,
        token,
        canEdit: !!canEdit,
        canComment: !!canComment,
        canDownload: !!canDownload,
        expiresAt,
      },
    });

    return created({
      token: link.token,
      canEdit: link.canEdit,
      canComment: link.canComment,
      canDownload: link.canDownload,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      createdAt: link.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[POST share link]", err);
    return serverError();
  }
}

// ── PATCH /api/projects/[id]/share ── update permissions on existing link ─────
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { authorId: true },
    });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const link = await prisma.sharedLink.findFirst({ where: { projectId } });
    if (!link) return notFound("No shared link exists. Create one first.");

    const body = await request.json().catch(() => ({}));
    const updated = await prisma.sharedLink.update({
      where: { id: link.id },
      data: {
        canEdit: body.canEdit !== undefined ? !!body.canEdit : link.canEdit,
        canComment: body.canComment !== undefined ? !!body.canComment : link.canComment,
        canDownload: body.canDownload !== undefined ? !!body.canDownload : link.canDownload,
      },
    });

    return ok({
      token: updated.token,
      canEdit: updated.canEdit,
      canComment: updated.canComment,
      canDownload: updated.canDownload,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[PATCH share link]", err);
    return serverError();
  }
}

// ── DELETE /api/projects/[id]/share ── revoke shared link ─────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { authorId: true },
    });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    await prisma.sharedLink.deleteMany({ where: { projectId } });
    return ok({ revoked: true });
  } catch (err) {
    console.error("[DELETE share link]", err);
    return serverError();
  }
}
