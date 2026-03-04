import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, badRequest, serverError } from "@/lib/utils";
import { DEFAULT_PREFERENCES } from "@/types";
import type { UserPreferences } from "@/types";

// ─── GET /api/profile ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isEmailVerified: true,
        bio: true,
        phone: true,
        jobTitle: true,
        company: true,
        website: true,
        location: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
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

    return ok({ ...user, preferences });
  } catch (err) {
    console.error("[GET /api/profile]", err);
    return serverError();
  }
}

// ─── PATCH /api/profile ──────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json();
    const { name, bio, phone, jobTitle, company, website, location, avatarUrl } = body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return badRequest("Name cannot be empty");
    }
    if (website && !/^https?:\/\//i.test(website)) {
      return badRequest("Website must start with http:// or https://");
    }

    const updated = await prisma.user.update({
      where: { id: session.sub },
      data: {
        ...(name     !== undefined ? { name: name.trim() } : {}),
        ...(bio      !== undefined ? { bio: bio || null } : {}),
        ...(phone    !== undefined ? { phone: phone || null } : {}),
        ...(jobTitle !== undefined ? { jobTitle: jobTitle || null } : {}),
        ...(company  !== undefined ? { company: company || null } : {}),
        ...(website  !== undefined ? { website: website || null } : {}),
        ...(location !== undefined ? { location: location || null } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isEmailVerified: true,
        bio: true,
        phone: true,
        jobTitle: true,
        company: true,
        website: true,
        location: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok(updated, "Profile updated");
  } catch (err) {
    console.error("[PATCH /api/profile]", err);
    return serverError();
  }
}
