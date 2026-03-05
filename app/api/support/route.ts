import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ok, created, badRequest, unauthorized, serverError,
} from "@/lib/utils";

// GET /api/support — list authenticated user's own support tickets
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
    });

    return ok(tickets);
  } catch (err) {
    console.error("[GET /api/support]", err);
    return serverError();
  }
}

// POST /api/support — create a new support ticket
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json();
    const { subject, details, screenshotUrl } = body as {
      subject?: string;
      details?: string;
      screenshotUrl?: string;
    };

    if (!subject?.trim()) return badRequest("Subject is required.");
    if (!details?.trim()) return badRequest("Details are required.");
    if (subject.length > 200) return badRequest("Subject must be 200 characters or less.");

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.sub,
        subject: subject.trim(),
        details: details.trim(),
        screenshotUrl: screenshotUrl ?? null,
      },
    });

    return created(ticket, "Support ticket submitted successfully.");
  } catch (err) {
    console.error("[POST /api/support]", err);
    return serverError();
  }
}
