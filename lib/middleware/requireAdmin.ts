import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Checks that the request is authenticated and the user is ADMIN or SUPER_ADMIN.
 * Returns the session on success, or a NextResponse error if unauthorized.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/**
 * Checks that the request is authenticated and the user is specifically SUPER_ADMIN.
 */
export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.role !== "SUPER_ADMIN") {
    return {
      session: null,
      error: NextResponse.json({ success: false, error: "Forbidden — Super Admin only" }, { status: 403 }),
    };
  }
  return { session, error: null };
}
