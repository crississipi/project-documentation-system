/**
 * Static export build script.
 *
 * Next.js `output: "export"` cannot coexist with API route handlers in the
 * same project — it tries to statically pre-render them and fails.
 * This script temporarily moves `app/api` out of the way, runs the static
 * build, then always restores the directory (even on build failure).
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT, "app", "api");
const API_TEMP = path.join(ROOT, "_api_static_backup");

let moved = false;

function restore() {
  if (moved && fs.existsSync(API_TEMP)) {
    fs.renameSync(API_TEMP, API_DIR);
    console.log("✓ Restored app/api");
  }
}

// Always restore on process exit (covers Ctrl+C, errors, etc.)
process.on("exit", restore);
process.on("SIGINT", () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));

try {
  if (fs.existsSync(API_DIR)) {
    fs.renameSync(API_DIR, API_TEMP);
    moved = true;
    console.log("→ Moved app/api aside for static export build");
  }

  // Clear .next so TypeScript type validator doesn't reference moved API routes
  const dotNext = path.join(ROOT, ".next");
  if (fs.existsSync(dotNext)) {
    fs.rmSync(dotNext, { recursive: true, force: true });
    console.log("→ Cleared .next cache");
  }

  execSync("cross-env STATIC_EXPORT=true next build", {
    stdio: "inherit",
    cwd: ROOT,
  });

  restore();
  moved = false;
  console.log("\n✓ Static export complete — output is in the out/ directory");
} catch (err) {
  restore();
  moved = false;
  console.error("\n✗ Static build failed");
  process.exit(1);
}
