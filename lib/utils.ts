import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

// ─── API Response helpers ────────────────────────
export function ok<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status: 200 });
}

export function created<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status: 201 });
}

export function badRequest(error: string): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export function unauthorized(error = "Unauthorized"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbidden(error = "Forbidden"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 403 });
}

export function notFound(error = "Not found"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function conflict(error: string): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 409 });
}

export function serverError(error = "Internal server error"): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

// ─── Tags helpers ────────────────────────────────
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

// ─── Date helpers ────────────────────────────────
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── UI helpers ──────────────────────────────────
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/** Returns initials from a full name, e.g. "John Doe" → "JD" */
export function nameInitials(name: string, maxLength = 2): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, maxLength);
}

// ─── Token generation ────────────────────────────
export function generateToken(lengthBytes = 32): string {
  const array = new Uint8Array(lengthBytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── PIN generation (email verification) ─────────
// Uses unambiguous chars — no 0/O, 1/I/L confusion
const PIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generatePin(length = 6): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => PIN_CHARS[b % PIN_CHARS.length]).join("");
}
