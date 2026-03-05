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
    const filter = searchParams.get("filter") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    // When not explicitly requesting disabled accounts, always exclude them from
    // the active list so a disabled user never shows in Active Users.
    const isDisabledFilter = filter === "disabled" ? { isDisabled: true } : { isDisabled: false };

    const extraFilter =
      filter === "verified"   ? { isEmailVerified: true }
      : filter === "unverified" ? { isEmailVerified: false }
      : filter === "admin"      ? { role: "ADMIN" as const }
      : filter === "superadmin" ? { role: "SUPER_ADMIN" as const }
      : {};

    const searchClause = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};

    const andClauses: object[] = [isDisabledFilter];
    if (Object.keys(extraFilter).length > 0) andClauses.push(extraFilter);
    if (search) andClauses.push(searchClause);

    const where = andClauses.length === 1 ? andClauses[0] : { AND: andClauses };

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
          isDisabled: true,
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
// Body: { userId, action, role?, permissions?, confirmKey? }
// Only SUPER_ADMIN can change roles
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      userId?: string;
      action?: string;
      role?: string;
      permissions?: string[];
      confirmKey?: string;
    };

    if (!body.userId) return badRequest("userId is required");
    if (!body.action) return badRequest("action is required");

    // ── disable / enable (ADMIN+) ──────────────────────────────────────────
    if (body.action === "disable" || body.action === "enable") {
      const { error } = await requireAdmin();
      if (error) return error;

      const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { role: true } });
      if (!target) return badRequest("User not found");
      if (target.role === "SUPER_ADMIN") return badRequest("Cannot disable a Super Admin.");

      const updated = await prisma.user.update({
        where: { id: body.userId },
        data: {
          isDisabled: body.action === "disable",
          disabledAt: body.action === "disable" ? new Date() : null,
        },
        select: { id: true, email: true, name: true, isDisabled: true },
      });
      return ok(updated, `User ${body.action}d successfully.`);
    }

    // ── role change / promote to SUPER_ADMIN (SUPER_ADMIN only) ───────────
    if (body.action === "setRole" || body.action === "promoteToSuperAdmin") {
      const { error } = await requireSuperAdmin();
      if (error) return error;

      if (body.action === "promoteToSuperAdmin") {
        if (!body.confirmKey || body.confirmKey !== "CONFIRM_SUPER_ADMIN") {
          return badRequest("Invalid confirmation key. Type CONFIRM_SUPER_ADMIN to proceed.");
        }
        const updated = await prisma.user.update({
          where: { id: body.userId },
          data: {
            role: "SUPER_ADMIN",
            preferences: body.permissions ? JSON.stringify(body.permissions) : undefined,
          },
          select: { id: true, email: true, name: true, role: true },
        });
        return ok(updated, `User promoted to Super Admin.`);
      }

      if (!body.role || !["USER", "ADMIN"].includes(body.role)) {
        return badRequest("role must be USER or ADMIN");
      }
      const updated = await prisma.user.update({
        where: { id: body.userId },
        data: { role: body.role as "USER" | "ADMIN" },
        select: { id: true, email: true, name: true, role: true },
      });
      return ok(updated);
    }

    return badRequest("Unknown action");
  } catch (err) {
    console.error("[PATCH /api/admin/users]", err);
    return serverError();
  }
}
