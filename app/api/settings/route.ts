import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, serverError } from "@/lib/utils";
import { DEFAULT_PREFERENCES } from "@/types";
import type { UserPreferences } from "@/types";

// ─── GET /api/settings ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { preferences: true },
    });
    if (!user) return unauthorized();

    const preferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(user.preferences as Partial<UserPreferences> ?? {}),
      emailNotifications: {
        ...DEFAULT_PREFERENCES.emailNotifications,
        ...((user.preferences as Partial<UserPreferences>)?.emailNotifications ?? {}),
      },
    };

    return ok(preferences);
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return serverError();
  }
}

// ─── PATCH /api/settings ─────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body: Partial<UserPreferences> = await req.json();

    // Fetch existing prefs so we can merge
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { preferences: true },
    });
    if (!user) return unauthorized();

    const existing: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(user.preferences as Partial<UserPreferences> ?? {}),
      emailNotifications: {
        ...DEFAULT_PREFERENCES.emailNotifications,
        ...((user.preferences as Partial<UserPreferences>)?.emailNotifications ?? {}),
      },
    };

    const merged: UserPreferences = {
      ...existing,
      ...body,
      emailNotifications: {
        ...existing.emailNotifications,
        ...(body.emailNotifications ?? {}),
      },
    };

    await prisma.user.update({
      where: { id: session.sub },
      data: { preferences: merged as object },
    });

    return ok(merged, "Settings saved");
  } catch (err) {
    console.error("[PATCH /api/settings]", err);
    return serverError();
  }
}
