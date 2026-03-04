import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── API Key Authentication ────────────────────────────────────
// Keys are prefixed with "ontap_" followed by 48 hex chars.
// We store the SHA-256 hash of the full key in the database.
// The first 8 chars (after prefix) are stored as `prefix` for display.

const API_KEY_PREFIX = "ontap_";

export interface ApiKeySession {
  userId: string;
  apiKeyId: string;
  scopes: string[];
}

/** SHA-256 hash a string and return hex */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a new API key: returns { raw, prefix, hashedKey } */
export async function generateApiKey(): Promise<{
  raw: string;
  prefix: string;
  hashedKey: string;
}> {
  const randomBytes = new Uint8Array(24); // 48 hex chars
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const raw = `${API_KEY_PREFIX}${hex}`;
  const prefix = hex.slice(0, 8);
  const hashedKey = await sha256(raw);

  return { raw, prefix, hashedKey };
}

/** Hash a raw API key for database lookup */
export async function hashApiKey(rawKey: string): Promise<string> {
  return sha256(rawKey);
}

/**
 * Authenticate a request using an API key from the Authorization header.
 * Returns the ApiKeySession if valid, or null if not.
 *
 * Expected header: `Authorization: Bearer ontap_<hex>`
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiKeySession | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const rawKey = parts[1];
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

  const hashedKey = await sha256(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey },
    select: {
      id: true,
      userId: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!apiKey) return null;

  // Check if revoked
  if (apiKey.revokedAt) return null;

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  let scopes: string[];
  try {
    scopes = JSON.parse(apiKey.scopes) as string[];
  } catch {
    scopes = [];
  }

  return {
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
    scopes,
  };
}

/** Check whether a session has a specific scope */
export function hasScope(session: ApiKeySession, scope: string): boolean {
  return session.scopes.includes("*") || session.scopes.includes(scope);
}

/** Log an API request (fire-and-forget) */
export function logApiUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  status: number,
  ip?: string | null
): void {
  prisma.apiUsageLog
    .create({
      data: {
        apiKeyId,
        endpoint,
        method,
        status,
        ip: ip ?? null,
      },
    })
    .catch(() => {});
}
