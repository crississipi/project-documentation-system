import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { inviteCollaboratorSchema } from "@/lib/validations";
import { sendInviteEmail } from "@/lib/mail";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
} from "@/lib/utils";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/projects/[id]/collaborators ─────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const collaborators = await prisma.projectCollaborator.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return ok(
      collaborators.map((c) => ({
        id: c.id,
        projectId: c.projectId,
        invitedEmail: c.invitedEmail,
        invitedName: c.invitedName,
        userId: c.userId,
        role: c.role,
        status: c.status,
        hasEdited: c.hasEdited,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("[GET collaborators]", err);
    return serverError();
  }
}

// ─── POST /api/projects/[id]/collaborators ─────────
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: projectId } = await params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { author: { select: { name: true } } },
    });
    if (!project) return notFound();
    if (project.authorId !== session.sub) return forbidden();

    const body = await request.json();
    const parsed = inviteCollaboratorSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    const { email, role } = parsed.data;

    // Prevent owner from inviting themselves
    const owner = await prisma.user.findUnique({ where: { id: session.sub }, select: { email: true } });
    if (owner?.email.toLowerCase() === email.toLowerCase()) {
      return badRequest("You cannot invite yourself.");
    }

    // Check for existing invite
    const existing = await prisma.projectCollaborator.findUnique({
      where: { projectId_invitedEmail: { projectId, invitedEmail: email.toLowerCase() } },
    });
    if (existing) return conflict("This user has already been invited.");

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Check if the invited user already has an account
    const invitedUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true },
    });

    const collaborator = await prisma.projectCollaborator.create({
      data: {
        projectId,
        invitedEmail: email.toLowerCase(),
        invitedName: invitedUser?.name ?? null,
        userId: invitedUser?.id ?? null,
        role,
        inviteToken,
        inviteTokenExpiry,
      },
    });

    await sendInviteEmail(email, project.author.name, project.title, role, inviteToken);

    return created({
      id: collaborator.id,
      projectId: collaborator.projectId,
      invitedEmail: collaborator.invitedEmail,
      invitedName: collaborator.invitedName,
      userId: collaborator.userId,
      role: collaborator.role,
      status: collaborator.status,
      hasEdited: collaborator.hasEdited,
      createdAt: collaborator.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[POST collaborators]", err);
    return serverError();
  }
}
