import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, notFound, badRequest, serverError } from "@/lib/utils";

type Params = { params: Promise<{ token: string }> };

// ─── POST /api/invite/[token] ─ accept invite ─────
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { token } = await params;

    const collaborator = await prisma.projectCollaborator.findUnique({
      where: { inviteToken: token },
      include: { project: { select: { id: true, title: true } } },
    });

    if (!collaborator) return notFound("Invite not found or already used.");
    if (new Date() > collaborator.inviteTokenExpiry) {
      return badRequest("This invitation has expired.");
    }
    if (collaborator.status === "ACCEPTED") {
      return ok({ projectId: collaborator.projectId, alreadyAccepted: true });
    }

    // Verify the accepting user's email matches the invite
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { email: true, name: true },
    });
    if (!user) return unauthorized();
    if (user.email.toLowerCase() !== collaborator.invitedEmail.toLowerCase()) {
      return badRequest("This invitation was sent to a different email address.");
    }

    // Accept the invite — link user, set status ACCEPTED
    await prisma.projectCollaborator.update({
      where: { id: collaborator.id },
      data: {
        status: "ACCEPTED",
        userId: session.sub,
        invitedName: user.name,
      },
    });

    return ok({ projectId: collaborator.projectId, alreadyAccepted: false });
  } catch (err) {
    console.error("[POST invite accept]", err);
    return serverError();
  }
}

// ─── GET /api/invite/[token] ─ preview invite info ─
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const collaborator = await prisma.projectCollaborator.findUnique({
      where: { inviteToken: token },
      include: {
        project: { select: { title: true, author: { select: { name: true } } } },
      },
    });

    if (!collaborator) return notFound("Invite not found.");
    if (new Date() > collaborator.inviteTokenExpiry) {
      return badRequest("This invitation has expired.");
    }

    return ok({
      projectTitle: collaborator.project.title,
      inviterName: collaborator.project.author.name,
      role: collaborator.role,
      status: collaborator.status,
      invitedEmail: collaborator.invitedEmail,
    });
  } catch (err) {
    console.error("[GET invite info]", err);
    return serverError();
  }
}
