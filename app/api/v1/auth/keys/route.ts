import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateApiKey } from "@/lib/apiKeyAuth";
import { createApiKeySchema } from "@/lib/validations";
import { ok, created, badRequest, unauthorized, serverError } from "@/lib/utils";
import type { ApiKeyData, CreateApiKeyResponse } from "@/types";

// ─── GET /api/v1/auth/keys — List all API keys for the current user ──
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.sub, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const data: ApiKeyData[] = keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: JSON.parse(k.scopes) as string[],
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));

    return ok(data);
  } catch (err) {
    console.error("[GET /api/v1/auth/keys]", err);
    return serverError();
  }
}

// ─── POST /api/v1/auth/keys — Create a new API key ──
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0].message);

    // Limit to 10 active keys per user
    const activeCount = await prisma.apiKey.count({
      where: { userId: session.sub, revokedAt: null },
    });
    if (activeCount >= 10) {
      return badRequest("Maximum of 10 active API keys allowed. Revoke an existing key first.");
    }

    const { raw, prefix, hashedKey } = await generateApiKey();

    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: session.sub,
        name: parsed.data.name,
        prefix,
        hashedKey,
        scopes: JSON.stringify(parsed.data.scopes),
        expiresAt,
      },
    });

    const response: CreateApiKeyResponse = {
      key: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        scopes: parsed.data.scopes,
        lastUsedAt: null,
        expiresAt: expiresAt?.toISOString() ?? null,
        createdAt: apiKey.createdAt.toISOString(),
      },
      rawKey: raw,
    };

    return created(response, "API key created. Store the key securely — it won't be shown again.");
  } catch (err) {
    console.error("[POST /api/v1/auth/keys]", err);
    return serverError();
  }
}
