// sync-docs.mjs — OnTap Dev sync script
// Usage:
//   1. Copy this file to your project root.
//   2. Add ONTAP_API_KEY and ONTAP_PROJECT_ID to your .env (or export them).
//   3. Run: node sync-docs.mjs   (Node 18+)
//      or:  bun sync-docs.mjs
//
// The script walks the project root, collects all source files, masks .env
// values so no real secrets leave your machine, then POSTs everything to the
// OnTap Dev sync API.

import { readFileSync, readdirSync } from "fs";
import { execSync }                  from "child_process";
import { join, relative, extname, basename } from "path";

// ── Configuration ─────────────────────────────────────────────────────────────
// Load .env if present (Node 20.6+ supports --env-file; earlier versions need dotenv)
const API_KEY    = process.env.ONTAP_API_KEY;
const PROJECT_ID = process.env.ONTAP_PROJECT_ID;
const API_BASE   = "https://project-documentation-system.vercel.app";
const ROOT       = process.env.ROOT ? join(process.cwd(), process.env.ROOT) : process.cwd();
const DRY_RUN    = process.env.DRY_RUN === "true";

if (!API_KEY) {
  console.error("Error: ONTAP_API_KEY environment variable is not set.");
  console.error("  Set it in your .env file or export it before running this script.");
  process.exit(1);
}
if (!PROJECT_ID) {
  console.error("Error: ONTAP_PROJECT_ID environment variable is not set.");
  console.error("  Find your Project ID in the URL when viewing a project in OnTap Dev.");
  process.exit(1);
}

// ── Directories to skip entirely ─────────────────────────────────────────────
const IGNORE_DIRS = new Set([
  // JavaScript / Node
  "node_modules", ".npm", ".yarn", ".pnp",
  // Build outputs
  ".next", ".nuxt", ".svelte-kit", "dist", "build", "out", ".output",
  // Test / coverage
  "coverage", ".nyc_output",
  // Cache & tooling
  ".turbo", ".cache", ".parcel-cache", ".vite", ".rollup.cache",
  // Python
  "__pycache__", "venv", ".venv", ".tox", ".mypy_cache", ".pytest_cache",
  // Go / Java / .NET / C++
  "vendor", ".gradle", "target", "bin", "obj", "Pods",
  // Version control
  ".git", ".svn", ".hg",
  // IDE artefacts
  ".idea", ".vscode",
  // Logs & temp
  "logs", "tmp", "temp",
]);

// ── File extensions to include ────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([
  // Web
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
  ".vue", ".svelte", ".astro",
  ".css", ".scss", ".sass", ".less",
  ".html",
  // Backend
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts",
  ".cs", ".fs", ".cpp", ".c", ".h", ".hpp", ".php",
  // Config / data
  ".json", ".yaml", ".yml", ".toml", ".ini",
  // Docs / markup
  ".md", ".mdx", ".txt", ".rst",
  // Query / schema
  ".sql", ".graphql", ".gql", ".prisma",
  // Shell
  ".sh", ".bash", ".zsh", ".fish", ".ps1",
]);

// .env files matched by name (values are masked before upload)
const ENV_BASENAME_RE = /^\.env(\.[\w.]+)?$/;

// ── Files to always skip by exact name ───────────────────────────────────────
const IGNORE_FILENAMES = new Set([
  "package-lock.json", "yarn.lock", "bun.lock", "pnpm-lock.yaml",
  "composer.lock", "Gemfile.lock", "Cargo.lock",
  ".DS_Store", "Thumbs.db", "desktop.ini",
  "tsconfig.tsbuildinfo",
]);

// ── Mask .env values — keeps variable names, replaces values with <VALUE> ────
function maskEnvContent(content) {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      // Preserve blank lines, comments, and export-only lines
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return line;
      const eqIdx = line.indexOf("=");
      const key   = line.slice(0, eqIdx + 1);
      return `${key}<VALUE>`;
    })
    .join("\n");
}

// ── Recursively collect files ─────────────────────────────────────────────────
function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        results.push(...collectFiles(join(dir, entry.name)));
      }
      continue;
    }
    if (!entry.isFile()) continue;

    const name = entry.name;
    if (IGNORE_FILENAMES.has(name)) continue;

    const ext = extname(name).toLowerCase();
    const isEnvFile = ENV_BASENAME_RE.test(name);
    if (!isEnvFile && !ALLOWED_EXTENSIONS.has(ext)) continue;

    results.push(join(dir, name));
  }
  return results;
}

// ── Build payload ─────────────────────────────────────────────────────────────
const filePaths = collectFiles(ROOT);
console.log(`Found ${filePaths.length} files to sync from ${ROOT}`);

if (DRY_RUN) {
  for (const p of filePaths) {
    console.log(" •", relative(ROOT, p).replace(/\\/g, "/"));
  }
  console.log("\nDry run complete — no files were sent.");
  process.exit(0);
}

const files = filePaths.map((absPath) => {
  const filePath = relative(ROOT, absPath).replace(/\\/g, "/");
  const isEnvFile = ENV_BASENAME_RE.test(basename(filePath));

  let content = readFileSync(absPath, "utf-8");
  if (isEnvFile) content = maskEnvContent(content);

  return { filePath, content };
});

// ── Git metadata (optional — skipped if not in a git repo) ───────────────────
let commitHash, branch;
try {
  commitHash = execSync("git rev-parse HEAD",        { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
  branch     = execSync("git branch --show-current", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
} catch {
  // not a git repo — proceed without metadata
}

// ── Sync ──────────────────────────────────────────────────────────────────────
console.log(`Syncing ${files.length} files to project ${PROJECT_ID}…`);

const res = await fetch(`${API_BASE}/api/v1/projects/${PROJECT_ID}/sync`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type":  "application/json",
  },
  body: JSON.stringify({
    files,
    ...(commitHash && { commitHash }),
    ...(branch     && { branch }),
  }),
});

const json = await res.json();

if (!res.ok) {
  console.error(`Sync failed (${res.status}):`, json.error ?? "Unknown error");
  process.exit(1);
}

console.log("✓", json.message ?? "Sync complete.");
if (json.data) {
  const { sectionsCreated, sectionsUpdated, filesProcessed } = json.data;
  if (filesProcessed !== undefined) console.log(`  Files processed : ${filesProcessed}`);
  if (sectionsCreated !== undefined) console.log(`  Sections created: ${sectionsCreated}`);
  if (sectionsUpdated !== undefined) console.log(`  Sections updated: ${sectionsUpdated}`);
}
