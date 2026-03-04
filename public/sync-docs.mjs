// sync-docs.mjs — OnTap Dev sync script with AI-powered documentation
// ──────────────────────────────────────────────────────────────────────────────
// Usage:
//   1. Copy this file to your project root.
//   2. Set environment variables in .env:
//        ONTAP_API_KEY=ontap_YOUR_KEY
//        ONTAP_PROJECT_ID=YOUR_PROJECT_UUID
//        OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY     # enables AI docs
//        OPENROUTER_MODEL=google/gemini-2.0-flash-001  # optional model override
//   3. Run: node sync-docs.mjs   (Node 18+)
//      or:  bun sync-docs.mjs
//
// Without OPENROUTER_API_KEY the script syncs files without AI descriptions
// (same behaviour as before). With the key, it generates professional
// docstrings for every extracted symbol via the selected model on OpenRouter.
// ──────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync } from "fs";
import { execSync }                  from "child_process";
import { join, relative, extname, basename } from "path";

// ══════════════════════════════════════════════════════════════════════════════
// .env file loader — reads .env from CWD into process.env (no dependencies)
// ══════════════════════════════════════════════════════════════════════════════

function loadEnvFile(dir) {
  const envPath = join(dir, ".env");
  if (!existsSync(envPath)) return;
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Only set if not already defined (real env vars take precedence)
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
    console.log(`Loaded environment from ${envPath}`);
  } catch { /* ignore read errors */ }
}

loadEnvFile(process.cwd());

// ══════════════════════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════════════════════

const API_KEY    = process.env.ONTAP_API_KEY;
const PROJECT_ID = process.env.ONTAP_PROJECT_ID;
const API_BASE   = process.env.ONTAP_API_BASE ?? "https://project-documentation-system.vercel.app";
const ROOT       = process.env.ROOT ? join(process.cwd(), process.env.ROOT) : process.cwd();
const DRY_RUN    = process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1";

// AI configuration (optional — set OPENROUTER_API_KEY to enable)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";
const AI_ENABLED         = Boolean(OPENROUTER_API_KEY);
const AI_CONCURRENCY     = parseInt(process.env.AI_CONCURRENCY ?? "3", 10);

if (!API_KEY) {
  console.error("Error: ONTAP_API_KEY environment variable is not set.");
  console.error("Set it in your .env file or export it: export ONTAP_API_KEY=ontap_xxx");
  process.exit(1);
}
if (!PROJECT_ID) {
  console.error("Error: ONTAP_PROJECT_ID environment variable is not set.");
  console.error("Set it in your .env file or export it: export ONTAP_PROJECT_ID=your-uuid");
  process.exit(1);
}
if (AI_ENABLED) {
  console.log(`AI documentation enabled — model: ${OPENROUTER_MODEL}`);
} else {
  console.log("AI documentation disabled (set OPENROUTER_API_KEY in .env to enable).");
}

// ══════════════════════════════════════════════════════════════════════════════
// File filtering
// ══════════════════════════════════════════════════════════════════════════════

const IGNORE_DIRS = new Set([
  "node_modules", ".npm", ".yarn", ".pnp",
  ".next", ".nuxt", ".svelte-kit", "dist", "build", "out", ".output",
  "coverage", ".nyc_output",
  ".turbo", ".cache", ".parcel-cache", ".vite", ".rollup.cache",
  "__pycache__", "venv", ".venv", ".tox", ".mypy_cache", ".pytest_cache",
  "vendor", ".gradle", "target", "bin", "obj", "Pods",
  ".git", ".svn", ".hg",
  ".idea", ".vscode",
  "logs", "tmp", "temp",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
  ".vue", ".svelte", ".astro",
  ".css", ".scss", ".sass", ".less", ".html",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts",
  ".cs", ".fs", ".cpp", ".c", ".h", ".hpp", ".php",
  ".json", ".yaml", ".yml", ".toml", ".ini",
  ".md", ".mdx", ".txt", ".rst",
  ".sql", ".graphql", ".gql", ".prisma",
  ".sh", ".bash", ".zsh", ".fish", ".ps1",
]);

const ENV_BASENAME_RE = /^\.env(\.[\w.]+)?$/;

const IGNORE_FILENAMES = new Set([
  "package-lock.json", "yarn.lock", "bun.lock", "pnpm-lock.yaml",
  "composer.lock", "Gemfile.lock", "Cargo.lock",
  ".DS_Store", "Thumbs.db", "desktop.ini",
  "tsconfig.tsbuildinfo",
]);

/** Languages that support symbol extraction. */
const EXTRACTABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
  ".py", ".go", ".rs", ".java", ".kt", ".kts",
  ".cs", ".cpp", ".c", ".h", ".hpp", ".php", ".rb",
]);

function maskEnvContent(content) {
  return content.split("\n").map((line) => {
    const t = line.trimStart();
    if (!t || t.startsWith("#") || !t.includes("=")) return line;
    return line.slice(0, line.indexOf("=") + 1) + "<VALUE>";
  }).join("\n");
}

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) results.push(...collectFiles(join(dir, entry.name)));
      continue;
    }
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (IGNORE_FILENAMES.has(name)) continue;
    const ext = extname(name).toLowerCase();
    if (!ENV_BASENAME_RE.test(name) && !ALLOWED_EXTENSIONS.has(ext)) continue;
    results.push(join(dir, name));
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
// Symbol extraction — regex-based, multi-language
// ══════════════════════════════════════════════════════════════════════════════
// Modelled on ctags / tree-sitter patterns used by Typedoc, Doxygen, Sphinx,
// and Sourcegraph for symbol discovery.

/**
 * Extract symbols (functions, classes, interfaces, types, variables, imports)
 * from source code using language-appropriate regex patterns.
 */
function extractSymbols(content, filePath) {
  const ext = extname(filePath).toLowerCase();
  const lines = content.split("\n");

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"].includes(ext)) {
    return extractJsTs(lines, ext);
  }
  if (ext === ".py")  return extractPython(lines);
  if (ext === ".go")  return extractGo(lines);
  if ([".java", ".kt", ".kts"].includes(ext)) return extractJavaKotlin(lines);
  if (ext === ".cs")  return extractCSharp(lines);
  if ([".cpp", ".c", ".h", ".hpp"].includes(ext)) return extractCpp(lines);
  if (ext === ".rs")  return extractRust(lines);
  if (ext === ".php") return extractPhp(lines);
  if (ext === ".rb")  return extractRuby(lines);
  return [];
}

// ── JS / TS ──────────────────────────────────────────────────────────────────

function extractJsTs(lines, ext) {
  const symbols = [];
  const isTS = [".ts", ".tsx", ".mts", ".cts"].includes(ext);

  const patterns = [
    { re: /^(import\s+.*)$/, kind: "import" },
    { re: /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)/, kind: "function" },
    { re: /^(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*(?::\s*[^=]+)?\s*=>/, kind: "function" },
    { re: /^(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/, kind: "function" },
    { re: /^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+(\w+)/, kind: "class" },
    ...(isTS ? [
      { re: /^(?:export\s+)?interface\s+(\w+)/, kind: "interface" },
      { re: /^(?:export\s+)?type\s+(\w+)\s*[=<]/, kind: "type" },
      { re: /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/, kind: "enum" },
    ] : []),
    { re: /^(?:export\s+(?:default\s+)?)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?!(?:async\s+)?(?:function|\([^)]*\)\s*=>|[a-zA-Z_$]\w*\s*=>))/, kind: "variable" },
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

    for (const { re, kind } of patterns) {
      const m = trimmed.match(re);
      if (!m) continue;

      if (kind === "import") {
        let importEnd = i;
        let full = lines[i];
        while (importEnd < lines.length - 1 && !full.includes(";") && !full.match(/['"][\s]*$/)) {
          importEnd++;
          full += "\n" + lines[importEnd];
        }
        const fromMatch = full.match(/from\s+['"]([^'"]+)['"]/);
        const importName = fromMatch ? fromMatch[1] : full.slice(0, 60).replace(/\n/g, " ");
        symbols.push({
          name: importName,
          kind: "import",
          startLine: i + 1,
          endLine: importEnd + 1,
          signature: full.replace(/\n/g, " ").trim(),
          body: full,
        });
        i = importEnd;
        break;
      }

      const name = m[1];
      const endLine = findBlockEnd(lines, i);
      const body = lines.slice(i, endLine).join("\n");
      const sig = extractSignature(trimmed, kind);

      symbols.push({ name, kind, startLine: i + 1, endLine, signature: sig, body });
      if (endLine > i + 1) i = endLine - 1;
      break;
    }
  }
  return symbols;
}

// ── Python ───────────────────────────────────────────────────────────────────

function extractPython(lines) {
  const symbols = [];
  const patterns = [
    { re: /^(from\s+\S+\s+import\s+.+|import\s+.+)$/, kind: "import" },
    { re: /^(?:async\s+)?def\s+(\w+)\s*\(/, kind: "function" },
    { re: /^class\s+(\w+)/, kind: "class" },
    { re: /^(\w+)\s*(?::\s*\w+)?\s*=/, kind: "variable" },
  ];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = lines[i].length - trimmed.length;

    for (const { re, kind } of patterns) {
      const m = trimmed.match(re);
      if (!m) continue;

      if (kind === "import") {
        symbols.push({
          name: trimmed.length > 60 ? trimmed.slice(0, 60) + "…" : trimmed,
          kind: "import", startLine: i + 1, endLine: i + 1,
          signature: trimmed, body: lines[i],
        });
        break;
      }

      const name = m[1];
      if (kind === "variable" && indent > 0) continue;

      const endLine = kind === "variable" ? i + 1 : findBlockEndPython(lines, i, indent);
      const body = lines.slice(i, endLine).join("\n");
      symbols.push({
        name, kind, startLine: i + 1, endLine,
        signature: trimmed.split(":")[0].trim(), body,
      });
      if (endLine > i + 1) i = endLine - 1;
      break;
    }
  }
  return symbols;
}

// ── Go ───────────────────────────────────────────────────────────────────────

function extractGo(lines) {
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    let m;
    if ((m = t.match(/^func\s+(?:\(\s*\w+\s+\*?\w+\s*\)\s+)?(\w+)\s*\(/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: "function", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/^type\s+(\w+)\s+(struct|interface)/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: m[2], startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/^(?:var|const)\s+(\w+)/))) {
      symbols.push({ name: m[1], kind: "variable", startLine: i+1, endLine: i+1, signature: t, body: lines[i] });
    } else if (t.match(/^import\s/)) {
      let end = i;
      if (t.includes("(")) { while (end < lines.length - 1 && !lines[end].includes(")")) end++; }
      symbols.push({ name: "imports", kind: "import", startLine: i+1, endLine: end+1, signature: lines.slice(i, end+1).join(" ").trim(), body: lines.slice(i, end+1).join("\n") });
      i = end;
    }
  }
  return symbols;
}

// ── Java / Kotlin ────────────────────────────────────────────────────────────

function extractJavaKotlin(lines) {
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    let m;
    if ((m = t.match(/^(import\s+.+);?$/))) {
      symbols.push({ name: m[1], kind: "import", startLine: i+1, endLine: i+1, signature: t, body: lines[i] });
    } else if ((m = t.match(/(?:public|private|protected|static|final|abstract|override|suspend|open|internal)*\s*(?:fun|void|int|String|boolean|long|double|float|char|byte|short|var|val|\w+)\s+(\w+)\s*\(/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: "function", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/(?:public|private|protected|static|abstract|final|open|internal|data|sealed|enum)?\s*(?:class|interface|enum|object)\s+(\w+)/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: t.includes("interface") ? "interface" : t.includes("enum") ? "enum" : "class", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    }
  }
  return symbols;
}

// ── C# ───────────────────────────────────────────────────────────────────────

function extractCSharp(lines) {
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    let m;
    if ((m = t.match(/^using\s+.+;$/))) {
      symbols.push({ name: t, kind: "import", startLine: i+1, endLine: i+1, signature: t, body: lines[i] });
    } else if ((m = t.match(/(?:public|private|protected|internal|static|virtual|override|abstract|async|partial)*\s*(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: "function", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/(?:public|private|protected|internal|static|abstract|sealed|partial)?\s*(?:class|interface|struct|enum|record)\s+(\w+)/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: t.includes("interface") ? "interface" : "class", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    }
  }
  return symbols;
}

// ── C / C++ ──────────────────────────────────────────────────────────────────

function extractCpp(lines) {
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    let m;
    if ((m = t.match(/^#include\s+[<"]([^>"]+)[>"]/))) {
      symbols.push({ name: m[1], kind: "import", startLine: i+1, endLine: i+1, signature: t, body: lines[i] });
    } else if ((m = t.match(/^(?:[\w:*&<>]+\s+)+(\w+)\s*\(/)) && !t.startsWith("if") && !t.startsWith("for") && !t.startsWith("while")) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: "function", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/^(?:class|struct|enum)\s+(\w+)/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: t.startsWith("enum") ? "enum" : "class", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    }
  }
  return symbols;
}

// ── Rust ─────────────────────────────────────────────────────────────────────

function extractRust(lines) {
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    let m;
    if ((m = t.match(/^use\s+.+;$/))) {
      symbols.push({ name: t, kind: "import", startLine: i+1, endLine: i+1, signature: t, body: lines[i] });
    } else if ((m = t.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: "function", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/^(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: t.includes("trait") ? "interface" : t.includes("enum") ? "enum" : "class", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    }
  }
  return symbols;
}

// ── PHP ──────────────────────────────────────────────────────────────────────

function extractPhp(lines) {
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    let m;
    if ((m = t.match(/^(?:use|require|require_once|include|include_once)\s+.+;$/))) {
      symbols.push({ name: t, kind: "import", startLine: i+1, endLine: i+1, signature: t, body: lines[i] });
    } else if ((m = t.match(/(?:public|private|protected|static)?\s*function\s+(\w+)\s*\(/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: "function", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/(?:abstract|final)?\s*class\s+(\w+)/))) {
      const end = findBlockEnd(lines, i);
      symbols.push({ name: m[1], kind: "class", startLine: i+1, endLine: end, signature: t.split("{")[0].trim(), body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    }
  }
  return symbols;
}

// ── Ruby ─────────────────────────────────────────────────────────────────────

function extractRuby(lines) {
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    let m;
    if ((m = t.match(/^require\s+.+$/))) {
      symbols.push({ name: t, kind: "import", startLine: i+1, endLine: i+1, signature: t, body: lines[i] });
    } else if ((m = t.match(/^def\s+(\w+)/))) {
      const end = findBlockEndRuby(lines, i);
      symbols.push({ name: m[1], kind: "function", startLine: i+1, endLine: end, signature: t, body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/^class\s+(\w+)/))) {
      const end = findBlockEndRuby(lines, i);
      symbols.push({ name: m[1], kind: "class", startLine: i+1, endLine: end, signature: t, body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    } else if ((m = t.match(/^module\s+(\w+)/))) {
      const end = findBlockEndRuby(lines, i);
      symbols.push({ name: m[1], kind: "module", startLine: i+1, endLine: end, signature: t, body: lines.slice(i, end).join("\n") });
      if (end > i+1) i = end - 1;
    }
  }
  return symbols;
}

// ══════════════════════════════════════════════════════════════════════════════
// Block-end detection helpers
// ══════════════════════════════════════════════════════════════════════════════

/** Find the end of a brace-delimited block (C-family languages). */
function findBlockEnd(lines, startIdx) {
  let depth = 0;
  let found = false;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") { depth++; found = true; }
      if (ch === "}") depth--;
      if (found && depth === 0) return i + 1;
    }
  }
  return startIdx + 1; // no braces — single-line declaration
}

/** Find the end of an indented block (Python). */
function findBlockEndPython(lines, startIdx, baseIndent) {
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent <= baseIndent) return i;
  }
  return lines.length;
}

/** Find the end of a Ruby def/class/module block (keyword…end). */
function findBlockEndRuby(lines, startIdx) {
  const baseIndent = lines[startIdx].length - lines[startIdx].trimStart().length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const t = lines[i].trimStart();
    const indent = lines[i].length - t.length;
    if (t === "end" && indent <= baseIndent) return i + 1;
  }
  return lines.length;
}

/** Extract a clean signature from the first line of a symbol. */
function extractSignature(line, kind) {
  if (kind === "import") return line.trim();
  return line.split("{")[0].split("=>")[0].replace(/\s+/g, " ").trim();
}

// ══════════════════════════════════════════════════════════════════════════════
// Cross-reference detection
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build a project-wide symbol index for cross-referencing.
 * Maps symbol name → { filePath, kind }.
 */
function buildSymbolIndex(allFileSymbols) {
  const index = new Map();
  for (const { filePath, symbols } of allFileSymbols) {
    for (const sym of symbols) {
      if (sym.kind === "import") continue;
      if (!index.has(sym.name)) {
        index.set(sym.name, { filePath, kind: sym.kind });
      }
    }
  }
  return index;
}

/**
 * Find referenced symbols inside a symbol's body.
 * Returns array of { name, filePath, kind } for symbols defined elsewhere.
 */
function findReferences(symbolBody, symbolName, symbolIndex) {
  const refs = [];
  const seen = new Set();
  for (const [name, info] of symbolIndex.entries()) {
    if (name === symbolName || seen.has(name)) continue;
    const re = new RegExp(`\\b${escapeRegex(name)}\\b`);
    if (re.test(symbolBody)) {
      seen.add(name);
      refs.push({ name, filePath: info.filePath, kind: info.kind });
    }
  }
  return refs;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ══════════════════════════════════════════════════════════════════════════════
// OpenRouter AI integration
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Call OpenRouter to generate a professional docstring for a symbol.
 *
 * The prompt follows patterns from Typedoc, JSDoc, Doxygen, and Sphinx:
 *  - Purpose (what the symbol does in practical terms)
 *  - Parameters / inputs
 *  - Return value
 *  - Side effects / exceptions
 *  - Cross-references to other project symbols
 *
 * The FULL file content is sent as context so the AI understands the broader
 * codebase structure, with the specific symbol highlighted for documentation.
 */
async function generateDocstring(symbol, fileContent, filePath, references, alreadyDocumented) {
  const refSection = references.length > 0
    ? `\n\nThis symbol references these other project symbols:\n${references.map(r => `- ${r.name} (${r.kind} in ${r.filePath})`).join("\n")}\nFor each referenced symbol, include a [see: NAME] marker so the documentation UI creates a navigable link.`
    : "";

  const dedupSection = alreadyDocumented.length > 0
    ? `\n\nThe following symbols have ALREADY been documented elsewhere. Do NOT re-explain them in detail. Instead, mention them briefly and add a [see: NAME] link:\n${alreadyDocumented.map(n => `- ${n}`).join("\n")}`
    : "";

  const prompt = `You are a senior technical writer creating reference documentation for a software project.
Analyze the source file below and write a clear, practical description for the highlighted symbol.

FILE: ${filePath}
${"─".repeat(60)}
${fileContent.length > 15000 ? fileContent.slice(0, 15000) + "\n// … (file truncated for brevity)" : fileContent}
${"─".repeat(60)}

SYMBOL TO DOCUMENT:
  Name: ${symbol.name}
  Kind: ${symbol.kind}
  Lines: ${symbol.startLine}–${symbol.endLine}
  Signature: ${symbol.signature}

SOURCE CODE:
\`\`\`
${symbol.body.length > 4000 ? symbol.body.slice(0, 4000) + "\n// … truncated" : symbol.body}
\`\`\`
${refSection}${dedupSection}

WRITING RULES:
1. Explain what this ${symbol.kind} does in clear, practical terms. Avoid overly academic or highly technical jargon.
2. For functions/methods: describe what it accepts, what it returns, any side effects, and when you would use it.
3. For classes/interfaces/types: describe its purpose, its key members, and how it fits into the broader system.
4. For variables/constants: describe the stored value, its purpose, and where it is consumed.
5. For imports: explain what is being imported and why it is needed in this file.
6. Use present tense and active voice ("Handles…", "Returns…", "Stores…").
7. If this symbol calls or uses other project symbols, add a [see: symbolName] marker for each — these become clickable links in the documentation.
8. If a referenced symbol was already documented, do NOT re-explain it — just mention it briefly with a [see: NAME] link.
9. Do NOT output code fences, markdown headers, the symbol name as a title, or filler like "This function…". Start directly with the action verb.
10. Keep it 1–4 sentences for simple symbols, up to 6 for complex ones. Be detailed but concise.
11. Match the quality and tone of professional Typedoc / JSDoc / Doxygen / Sphinx documentation output.

Respond with ONLY the documentation text — no JSON, no markdown formatting, just the plain description.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://project-documentation-system.vercel.app",
        "X-Title": "OnTap Dev Sync",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`  ⚠ AI failed for ${symbol.name}: ${res.status} — ${err.slice(0, 120)}`);
      return null;
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn(`  ⚠ AI error for ${symbol.name}: ${err.message}`);
    return null;
  }
}

/**
 * Generate AI docstrings for all symbols in a file with concurrency control.
 * Tracks which symbols have been documented to avoid redundant explanations.
 */
async function documentSymbolsWithAI(symbols, fileContent, filePath, symbolIndex, globalDocumented) {
  // If file has many imports, group them into one AI call instead of N calls
  const importSymbols = symbols.filter(s => s.kind === "import");
  const otherSymbols  = symbols.filter(s => s.kind !== "import");

  // Track symbols documented so far (for dedup across symbols in this file)
  const alreadyDocumented = [...globalDocumented];

  const tasks = [];

  // Batch imports if > 3
  if (importSymbols.length > 3) {
    tasks.push(async () => {
      const combinedBody = importSymbols.map(s => s.body).join("\n");
      const batchSymbol = {
        name: "imports",
        kind: "import",
        startLine: importSymbols[0].startLine,
        endLine: importSymbols[importSymbols.length - 1].endLine,
        signature: `${importSymbols.length} import statements`,
        body: combinedBody,
      };
      const doc = await generateDocstring(batchSymbol, fileContent, filePath, [], alreadyDocumented);
      if (doc) {
        for (const imp of importSymbols) imp.docstring = doc;
      }
    });
  } else {
    for (const sym of importSymbols) {
      tasks.push(async () => {
        const doc = await generateDocstring(sym, fileContent, filePath, [], alreadyDocumented);
        if (doc) sym.docstring = doc;
      });
    }
  }

  // Individual calls for non-import symbols — sequential to allow dedup tracking
  for (const sym of otherSymbols) {
    tasks.push(async () => {
      const refs = findReferences(sym.body, sym.name, symbolIndex);
      const doc = await generateDocstring(sym, fileContent, filePath, refs, alreadyDocumented);
      if (doc) {
        sym.docstring = doc;
        alreadyDocumented.push(sym.name);
        globalDocumented.add(sym.name);
      }
    });
  }

  await runConcurrent(tasks, AI_CONCURRENCY);
}

/** Run async tasks with a concurrency limit. */
async function runConcurrent(tasks, limit) {
  const executing = new Set();
  for (const task of tasks) {
    const p = task().then(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}

// ══════════════════════════════════════════════════════════════════════════════
// Main execution
// ══════════════════════════════════════════════════════════════════════════════

const filePaths = collectFiles(ROOT);
console.log(`Found ${filePaths.length} files to sync from ${ROOT}`);

if (DRY_RUN) {
  for (const p of filePaths) console.log(" •", relative(ROOT, p).replace(/\\/g, "/"));
  console.log("\nDry run complete — no files were sent.");
  process.exit(0);
}

// ── Phase 1: Read files & extract symbols ────────────────────────────────────
console.log("\n📂 Phase 1: Extracting symbols…");
const allFileData = filePaths.map((absPath) => {
  const filePath = relative(ROOT, absPath).replace(/\\/g, "/");
  const isEnvFile = ENV_BASENAME_RE.test(basename(filePath));
  let content = readFileSync(absPath, "utf-8");
  if (isEnvFile) content = maskEnvContent(content);

  const ext = extname(filePath).toLowerCase();
  const symbols = EXTRACTABLE_EXTENSIONS.has(ext) ? extractSymbols(content, filePath) : [];
  return { filePath, content, symbols };
});

const totalSymbols = allFileData.reduce((s, f) => s + f.symbols.length, 0);
console.log(`   Extracted ${totalSymbols} symbols from ${allFileData.filter(f => f.symbols.length > 0).length} files.`);

// ── Phase 2: Build cross-reference index ─────────────────────────────────────
console.log("\n🔗 Phase 2: Building cross-reference index…");
const symbolIndex = buildSymbolIndex(allFileData);
console.log(`   Indexed ${symbolIndex.size} unique symbols for cross-referencing.`);

// ── Phase 3: AI documentation ────────────────────────────────────────────────
if (AI_ENABLED && totalSymbols > 0) {
  console.log(`\n🤖 Phase 3: Generating AI documentation (${OPENROUTER_MODEL})…`);
  const globalDocumented = new Set(); // tracks all symbols documented so far for dedup
  let fileNum = 0;
  for (const file of allFileData) {
    if (file.symbols.length === 0) continue;
    fileNum++;
    const label = file.filePath.length > 50 ? "…" + file.filePath.slice(-47) : file.filePath;
    process.stdout.write(`   [${fileNum}] ${label} (${file.symbols.length} symbols)…`);
    await documentSymbolsWithAI(file.symbols, file.content, file.filePath, symbolIndex, globalDocumented);
    console.log(" ✓");
  }
  const documented = allFileData.reduce((s, f) => s + f.symbols.filter(sym => sym.docstring).length, 0);
  console.log(`   Generated descriptions for ${documented}/${totalSymbols} symbols.`);
} else if (AI_ENABLED) {
  console.log("\n🤖 Phase 3: No extractable symbols — skipping AI documentation.");
} else {
  console.log("\n⏭  Phase 3: Skipped (AI disabled).");
}

// ── Phase 4: Sync to OnTap Dev ───────────────────────────────────────────────
console.log("\n📤 Phase 4: Syncing to OnTap Dev…");
const files = allFileData.map(({ filePath, content, symbols }) => ({
  filePath,
  content,
  ...(symbols.length > 0 && {
    symbols: symbols.map(({ name, kind, startLine, endLine, signature, docstring }) => ({
      name, kind, startLine, endLine,
      ...(signature && { signature }),
      ...(docstring && { docstring }),
    })),
  }),
}));

let commitHash, branch;
try {
  commitHash = execSync("git rev-parse HEAD",        { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
  branch     = execSync("git branch --show-current", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
} catch { /* not a git repo */ }

console.log(`   Sending ${files.length} files to project ${PROJECT_ID}…`);

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
  console.error(`\n✗ Sync failed (${res.status}):`, json.error ?? "Unknown error");
  process.exit(1);
}

console.log(`\n✓ ${json.message ?? "Sync complete."}`);
if (json.data) {
  const { sectionsCreated, sectionsUpdated, filesProcessed } = json.data;
  if (filesProcessed !== undefined) console.log(`  Files processed : ${filesProcessed}`);
  if (sectionsCreated !== undefined) console.log(`  Sections created: ${sectionsCreated}`);
  if (sectionsUpdated !== undefined) console.log(`  Sections updated: ${sectionsUpdated}`);
}
