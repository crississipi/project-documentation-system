import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const isStaticExport = process.env.STATIC_EXPORT === "true";
const VERCEL_URL = "https://project-documentation-system.vercel.app";
const HOSTINGER_URL = "https://lightyellow-newt-377914.hostingersite.com";

// Content-Security-Policy — tightened per OWASP recommendations.
// Next.js App Router injects inline scripts for hydration on every page, so
// 'unsafe-inline' is required in production too. In dev we also allow
// 'unsafe-eval' for HMR / fast-refresh.
const CSP = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  // Allow API calls to Vercel when running from Hostinger static build
  `connect-src 'self' ${VERCEL_URL} ${HOSTINGER_URL}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
]
  .join("; ")
  .trim();

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Stop referrer leakage
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS — production only (breaks local HTTP dev)
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  // Disable unnecessary browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // XSS protection for older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // CSP
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],

  // Static export for Hostinger deployment.
  // Build normally for Vercel (prisma + API routes require server).
  // Run: set STATIC_EXPORT=true&& bun run build  (Windows)
  // Or:  STATIC_EXPORT=true bun run build         (Unix)
  ...(isStaticExport && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),

  // headers() is not supported in static export mode (output: "export").
  // When building for Hostinger, security headers are handled by .htaccess instead.
  ...(!isStaticExport && {
    async headers() {
      return [
        // ── Security headers on all routes ──────────────────────────────
        {
          source: "/(.*)",
          headers: securityHeaders,
        },
        // ── CORS for API routes ──────────────────────────────────────────
        // Required so that the Hostinger static-export frontend can make
        // credentialed cross-origin requests to the Vercel API.
        {
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Origin",      value: HOSTINGER_URL },
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Methods",     value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
            { key: "Access-Control-Allow-Headers",     value: "Content-Type, Authorization, Cookie" },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;

