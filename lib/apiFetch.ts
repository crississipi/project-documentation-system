/**
 * Drop-in fetch wrapper that:
 *   1. Prepends NEXT_PUBLIC_API_BASE_URL to every relative /api/… path
 *   2. Adds credentials:"include" so httpOnly cookies are forwarded cross-origin
 *      (required when the frontend is served from Hostinger and the API is on Vercel)
 */
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export function apiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === "string" && input.startsWith("/") ? `${BASE}${input}` : input;
  return fetch(url, { credentials: "include", ...init });
}
