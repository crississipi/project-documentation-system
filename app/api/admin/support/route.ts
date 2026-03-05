import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ok, badRequest, serverError,
} from "@/lib/utils";
import { requireAdmin } from "@/lib/middleware/requireAdmin";
import { sendSupportResolvedEmail } from "@/lib/mail";

// GET /api/admin/support — list all support tickets with optional search & filter
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const statusFilter = searchParams.get("status") ?? ""; // OPEN | IN_PROGRESS | RESOLVED
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(statusFilter ? { status: statusFilter as "OPEN" | "IN_PROGRESS" | "RESOLVED" } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search } },
              { details: { contains: search } },
              { user: { name: { contains: search } } },
              { user: { email: { contains: search } } },
            ],
          }
        : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, role: true },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return ok({
      tickets,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[GET /api/admin/support]", err);
    return serverError();
  }
}

// PATCH /api/admin/support — update ticket status/notes, optionally notify the user
export async function PATCH(req: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { ticketId, status, adminNotes, notify } = body as {
      ticketId?: string;
      status?: string;
      adminNotes?: string;
      notify?: boolean;
    };

    if (!ticketId) return badRequest("ticketId is required.");

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!ticket) return badRequest("Ticket not found.");

    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED"];
    if (status && !validStatuses.includes(status)) return badRequest("Invalid status.");

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(status ? { status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      },
    });

    // If resolved and notify=true, send in-app notification + email
    if (status === "RESOLVED" && notify) {
      const notifMessage = adminNotes
        ? `Your issue "${ticket.subject}" has been resolved. Admin notes: ${adminNotes}`
        : `Your issue "${ticket.subject}" has been marked as resolved.`;

      await prisma.notification.create({
        data: {
          userId: ticket.user.id,
          title: "Support Request Resolved",
          message: notifMessage,
          type: "success",
          link: `/?tab=support#${ticketId}`,
        },
      });

      // Send email (fire-and-forget)
      sendSupportResolvedEmail(
        ticket.user.email,
        ticket.user.name,
        ticket.subject,
        adminNotes ?? "",
        ticketId
      ).catch((e) => console.error("[sendSupportResolvedEmail]", e));
    }

    return ok(updated, "Ticket updated.");
  } catch (err) {
    console.error("[PATCH /api/admin/support]", err);
    return serverError();
  }
}
