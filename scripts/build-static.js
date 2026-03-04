/**
 * Static export build script.
 *
 * Next.js `output: "export"` cannot coexist with:
 *   - API route handlers  (app/api)
 *   - Dynamic routes that can't be pre-rendered  (app/shared/[token])
 *
 * This script temporarily moves those directories out of the way, runs the
 * static build, then always restores them (even on build failure).
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

// Each entry: { src: path inside app/, backup: top-level backup folder name }
const MOVES = [
  { src: path.join(ROOT, "app", "api"),           backup: path.join(ROOT, "_api_static_backup") },
  { src: path.join(ROOT, "app", "shared"),        backup: path.join(ROOT, "_shared_static_backup") },
];

let moved = [];

function restore() {
  for (const { src, backup } of moved) {
    if (fs.existsSync(backup)) {
      fs.renameSync(backup, src);
      console.log(`✓ Restored ${path.relative(ROOT, src)}`);
    }
  }
  moved = [];
}

// Always restore on process exit (covers Ctrl+C, errors, etc.)
process.on("exit", restore);
process.on("SIGINT",  () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));

try {
  // ── Self-healing: restore any leftover backups from a prior interrupted build
  for (const { src, backup } of MOVES) {
    if (fs.existsSync(backup) && !fs.existsSync(src)) {
      console.log(`⚠ Detected leftover ${path.basename(backup)} — auto-restoring before build.`);
      fs.renameSync(backup, src);
      console.log(`✓ Restored ${path.relative(ROOT, src)}`);
    }
  }

  // ── Move incompatible directories aside ──────────────────────────────────
  for (const { src, backup } of MOVES) {
    if (fs.existsSync(src)) {
      fs.renameSync(src, backup);
      moved.push({ src, backup });
      console.log(`→ Moved ${path.relative(ROOT, src)} aside for static export build`);
    }
  }

  // ── Clear .next so the TypeScript validator doesn't reference moved routes
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
  console.log("\n✓ Static export complete — output is in the out/ directory");
} catch (err) {
  restore();
  console.error("\n✗ Static build failed");
  process.exit(1);
}
