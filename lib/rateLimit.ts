/**
 * lib/rateLimit.ts
 *
 * Lightweight in-process rate limiter using a sliding-window counter.
 * Works in the Node.js API route runtime (not Edge).
 * For multi-instance production deployments, swap the Map for a Redis INCR implementation.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

// Keyed by `namespace:identifier` e.g. "login:127.0.0.1"
const store = new Map<string, RateLimitEntry>();

// Sweep old entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Bucket namespace — use a unique string per endpoint */
  namespace: string;
  /** Unique identifier: IP address, user ID, email, etc. */
  identifier: string;
  /** Max allowed requests within `windowMs` */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

export function rateLimit({
  namespace,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  // First hit or window expired — start a fresh window
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract the real client IP from Next.js request headers.
 * Handles reverse-proxy forwarding headers (Vercel, Cloudflare, nginx).
 */
export function getClientIp(request: Request): string {
  const headers = request instanceof Request ? request.headers : (request as { headers: Headers }).headers;
  return (
    (headers as Headers).get("x-forwarded-for")?.split(",")[0]?.trim() ??
    (headers as Headers).get("x-real-ip") ??
    (headers as Headers).get("cf-connecting-ip") ??
    "unknown"
  );
}

/**
 * Helper: returns a 429 JSON response with Retry-After header.
 */
export function tooManyRequests(resetAt: number): Response {
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ success: false, error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
