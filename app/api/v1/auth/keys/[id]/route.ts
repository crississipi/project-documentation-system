import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, notFound, forbidden, serverError } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// ─── DELETE /api/v1/auth/keys/[id] — Revoke an API key ──
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id } = await params;

    const apiKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey) return notFound("API key not found.");
    if (apiKey.userId !== session.sub) return forbidden();

    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return ok(null, "API key revoked.");
  } catch (err) {
    console.error("[DELETE /api/v1/auth/keys/:id]", err);
    return serverError();
  }
}
