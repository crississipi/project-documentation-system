import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { JWTPayload } from "@/types";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set. Cannot start server.");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? "86400"; // 24h

// ─── Sign a JWT ──────────────────────────────────
export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_EXPIRES}s`)
    .sign(JWT_SECRET);
}

// ─── Verify a JWT ────────────────────────────────
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Pre-auth token (for 2FA challenge flow) ─────
// Signed, short-lived JWT used between successful password auth and OTP verification.
// Prevents raw userId exposure to clients.
const PREAUTH_EXPIRES = 10 * 60; // 10 minutes in seconds

export async function signPreAuthToken(userId: string): Promise<string> {
  return await new SignJWT({ sub: userId, preAuth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PREAUTH_EXPIRES}s`)
    .sign(JWT_SECRET);
}

export async function verifyPreAuthToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.preAuth || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// ─── Get current session from cookies ────────────
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Set auth cookie ─────────────────────────────
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseInt(ACCESS_EXPIRES),
    path: "/",
  });
}

// ─── Clear auth cookie ───────────────────────────
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}
