import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serverError, ok, badRequest } from "@/lib/utils";
import { requireAdmin, requireSuperAdmin } from "@/lib/middleware/requireAdmin";

// GET /api/admin/users?search=&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isEmailVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          _count: { select: { projects: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ok({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return serverError();
  }
}

// PATCH /api/admin/users
// Body: { userId: string, role: "USER" | "ADMIN" }
// Only SUPER_ADMIN can change roles
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requireSuperAdmin();
    if (error) return error;

    const body = await request.json().catch(() => ({})) as {
      userId?: string;
      role?: string;
    };

    if (!body.userId) return badRequest("userId is required");
    if (!body.role || !["USER", "ADMIN"].includes(body.role)) {
      return badRequest("role must be USER or ADMIN");
    }

    const updated = await prisma.user.update({
      where: { id: body.userId },
      data: { role: body.role as "USER" | "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });

    return ok(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/users]", err);
    return serverError();
  }
}
