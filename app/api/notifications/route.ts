import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/utils";

// GET /api/notifications — list current user's notifications
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const notifications = await prisma.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n: { read: boolean }) => !n.read).length;

    return ok({ notifications, unreadCount });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return serverError();
  }
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json();
    const { ids, markAllRead } = body as { ids?: string[]; markAllRead?: boolean };

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: session.sub, read: false },
        data: { read: true },
      });
    } else if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { userId: session.sub, id: { in: ids } },
        data: { read: true },
      });
    }

    return ok(null, "Notifications updated.");
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return serverError();
  }
}

// DELETE /api/notifications — delete a notification
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      // Delete all read notifications
      await prisma.notification.deleteMany({
        where: { userId: session.sub, read: true },
      });
    } else {
      await prisma.notification.deleteMany({
        where: { userId: session.sub, id },
      });
    }

    return ok(null, "Notification(s) deleted.");
  } catch (err) {
    console.error("[DELETE /api/notifications]", err);
    return serverError();
  }
}
