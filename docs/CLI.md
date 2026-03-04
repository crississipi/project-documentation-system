# OnTap Dev Documentation — CLI & Automation Guide

Use the OnTap Dev HTTP API to push your source code directly into a project as
structured documentation. This is designed for CI/CD pipelines, local dev
scripts, or any tool that can make HTTP requests.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Generate an API Key](#generate-an-api-key)
3. [API Key Scopes](#api-key-scopes)
4. [Sync Endpoint Reference](#sync-endpoint-reference)
5. [Payload Schema](#payload-schema)
6. [How AI Auto-Generates Descriptions](#how-ai-auto-generates-descriptions)
7. [Symbol Extraction](#symbol-extraction)
8. [Quick Examples](#quick-examples)
9. [CI/CD Integration](#cicd-integration)
10. [Response Format](#response-format)
11. [Limits & Constraints](#limits--constraints)

---

## How it works

```
Your Codebase
     │
     │  (1) You extract file content + symbols (functions, classes, types…)
     ▼
Sync Payload  ──POST──►  /api/v1/projects/{PROJECT_ID}/sync
                                    │
                                    │  (2) Server parses each file, auto-builds
                                    │      formatted HTML from symbols + docstrings
                                    ▼
                          Project Sections in OnTap Dev UI
```

Each file you send becomes **one Section** in your project. If the section
already exists (matched by filename), it is updated in place. New files create
new sections. A **snapshot** record is stored for every sync so you can track
history per commit or branch.

---

## Generate an API Key

Keys are created in the web UI:

1. Log into **OnTap Dev**
2. Go to **Settings → API Keys**
3. Click **Create Key**
4. Give the key a name (e.g. `CI Pipeline`, `Local Dev`)
5. Select the **scopes** you need (see below)
6. Optionally set an expiry in days
7. Click **Generate Key**

> **Important:** The full key is shown **only once** immediately after creation.  
> Copy it to a secure location (e.g. a GitHub secret or `.env` file).  
> Stored format: `ontap_<48 hex characters>` — always 54 characters total.

---

## API Key Scopes

| Scope  | What it allows |
|--------|----------------|
| `sync` | Push file content to the sync endpoint |
| `read` | Read project data via the API |
| `*`    | All permissions (sync + read + future scopes) |

Assign the minimum scope needed. A CI pipeline that only syncs docs needs
`sync` only.

---

## Sync Endpoint Reference

```
POST https://project-documentation-system.vercel.app/api/v1/projects/{PROJECT_ID}/sync
```

### Required Headers

| Header            | Value                          |
|-------------------|--------------------------------|
| `Authorization`   | `Bearer ontap_YOUR_KEY`        |
| `Content-Type`    | `application/json`             |

### Finding your PROJECT_ID

Open the project in the OnTap Dev UI. The URL will be:

```
https://lightyellow-newt-377914.hostingersite.com/projects/{PROJECT_ID}
```

Copy the UUID from the URL.

---

## Payload Schema

```jsonc
{
  // Required: array of files to sync (1–500 files per request)
  "files": [
    {
      // Required: relative path within your repo
      "filePath": "src/components/Button.tsx",

      // Required: full raw source content of the file
      "content": "import React from 'react';\n...",

      // Optional: programming language (auto-detected from extension if omitted)
      "language": "typescript",

      // Optional: SHA-256 hex hash of the file content
      //   Computed automatically by the server if not provided.
      //   Supplying it speeds up processing and lets you detect unchanged files.
      "fileHash": "a3f1c...",

      // Optional: extracted symbols (functions, classes, interfaces, etc.)
      //   When provided, the server generates rich per-symbol documentation.
      //   When omitted, the entire file content is wrapped in a single code block.
      "symbols": [
        {
          "name": "Button",                  // symbol name
          "kind": "function",                // see Symbol Kinds below
          "startLine": 12,                   // 0-based line number
          "endLine": 34,
          "signature": "function Button(props: ButtonProps): JSX.Element",
          "docstring": "A reusable button component that supports multiple variants."
        }
      ]
    }
  ],

  // Optional: git commit SHA of the current sync
  "commitHash": "a1b2c3d4",

  // Optional: git branch name
  "branch": "main"
}
```

### Symbol Kinds

The `kind` field is a free-form string. Recommended values:

`function` · `class` · `method` · `interface` · `type` · `enum` · `constant` ·
`variable` · `constructor` · `property` · `module` · `namespace`

---

## How AI Auto-Generates Descriptions

The server converts each file payload into **TipTap-compatible HTML** that
populates the project section automatically. Here is exactly what gets generated:

### Without symbols (plain file)

```
<h1>Button.tsx</h1>
<p><em>src/components/Button.tsx</em> · typescript</p>
<hr>
<pre><code class="language-typescript">…full file content…</code></pre>
```

### With symbols

For every symbol in the `symbols` array the server generates:

```
<h1>Button.tsx</h1>
<p><em>src/components/Button.tsx</em> · typescript</p>
<hr>

<h2>Button</h2>
<p>function · lines 12–34</p>
<blockquote>
  A reusable button component that supports multiple variants.
</blockquote>
<pre><code class="language-typescript">function Button(props: ButtonProps): JSX.Element</code></pre>

<h2>ButtonProps</h2>
<p>interface · lines 1–11</p>
<blockquote>
  Props accepted by the Button component.
</blockquote>
<pre><code class="language-typescript">interface ButtonProps { … }</code></pre>
```

The `docstring` field is the source of the **description block** rendered inside
`<blockquote>`. This is what appears as the human-readable explanation for each
symbol in the documentation UI.

### How to populate `docstring`

The server does **not** call an external AI service — the "AI" part happens in
**your extraction script** before you send the payload. You can source the
`docstring` from:

| Source | How |
|--------|-----|
| **JSDoc / TSDoc** | Parse `/** ... */` comments above functions/classes using `typedoc`, `jsdoc`, or `ts-morph` |
| **Python docstrings** | Use `ast.get_docstring()` or `inspect.getdoc()` |
| **LLM generation** | Call GPT-4, Claude, or Gemini to summarize each symbol from its source lines |
| **Manual** | Write descriptions directly in your code comments |

#### Example: LLM-generated docstring (Node.js)

```js
import { readFileSync } from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

async function generateDocstring(symbolName, symbolCode) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Write a one-sentence documentation description for this code:\n\n${symbolCode}`,
      },
    ],
  });
  return response.choices[0].message.content.trim();
}
```

Then pass the result as the `docstring` for each symbol in your payload.

---

## Symbol Extraction

### TypeScript / JavaScript (using `ts-morph`)

```ts
import { Project } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.ts");

for (const sourceFile of project.getSourceFiles()) {
  const symbols = [];

  for (const fn of sourceFile.getFunctions()) {
    symbols.push({
      name: fn.getName() ?? "(anonymous)",
      kind: "function",
      startLine: fn.getStartLineNumber() - 1,
      endLine: fn.getEndLineNumber() - 1,
      signature: fn.getSignature().getDeclaration().getText().split("{")[0].trim(),
      docstring: fn.getJsDocs().map((d) => d.getDescription()).join(" ").trim(),
    });
  }

  for (const cls of sourceFile.getClasses()) {
    symbols.push({
      name: cls.getName() ?? "(anonymous)",
      kind: "class",
      startLine: cls.getStartLineNumber() - 1,
      endLine: cls.getEndLineNumber() - 1,
      signature: `class ${cls.getName()}`,
      docstring: cls.getJsDocs().map((d) => d.getDescription()).join(" ").trim(),
    });
  }

  // ... add to payload
}
```

### Python (using `ast`)

```python
import ast, hashlib

def extract_symbols(source_code):
    tree = ast.parse(source_code)
    symbols = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            symbols.append({
                "name": node.name,
                "kind": "function",
                "startLine": node.lineno - 1,
                "endLine": node.end_lineno - 1,
                "signature": f"def {node.name}(...)",
                "docstring": ast.get_docstring(node) or "",
            })
        elif isinstance(node, ast.ClassDef):
            symbols.append({
                "name": node.name,
                "kind": "class",
                "startLine": node.lineno - 1,
                "endLine": node.end_lineno - 1,
                "signature": f"class {node.name}",
                "docstring": ast.get_docstring(node) or "",
            })
    return symbols
```

---

## Quick Examples

### Minimal sync (curl)

```bash
curl -X POST \
  https://project-documentation-system.vercel.app/api/v1/projects/YOUR_PROJECT_ID/sync \
  -H "Authorization: Bearer ontap_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "filePath": "src/index.ts",
        "content": "export const hello = () => \"world\";"
      }
    ]
  }'
```

### Sync with symbols and git metadata (curl)

```bash
COMMIT=$(git rev-parse HEAD)
BRANCH=$(git branch --show-current)

curl -X POST \
  https://project-documentation-system.vercel.app/api/v1/projects/YOUR_PROJECT_ID/sync \
  -H "Authorization: Bearer ontap_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"commitHash\": \"$COMMIT\",
    \"branch\": \"$BRANCH\",
    \"files\": [
      {
        \"filePath\": \"src/utils.ts\",
        \"content\": \"export function add(a: number, b: number) { return a + b; }\",
        \"language\": \"typescript\",
        \"symbols\": [
          {
            \"name\": \"add\",
            \"kind\": \"function\",
            \"startLine\": 0,
            \"endLine\": 0,
            \"signature\": \"function add(a: number, b: number): number\",
            \"docstring\": \"Adds two numbers and returns their sum.\"
          }
        ]
      }
    ]
  }"
```

### Node.js sync script

This example walks the **entire project root**, ignoring generated and
third-party directories, only including source files, and automatically
masking `.env` values before they leave your machine.

```js
// sync-docs.mjs
import { readFileSync, readdirSync } from "fs";
import { execSync }                  from "child_process";
import { join, relative, extname, basename } from "path";

const API_KEY    = process.env.ONTAP_API_KEY;
const PROJECT_ID = process.env.ONTAP_PROJECT_ID;
const API_BASE   = "https://project-documentation-system.vercel.app";
const ROOT       = process.cwd(); // project root

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

// ── File extensions / names to document ──────────────────────────────────────
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

// .env files included by basename match (values are masked, see below)
const ENV_BASENAME_RE = /^\.env(\.[\w.]+)?$/;

// ── Files to always skip by name ─────────────────────────────────────────────
const IGNORE_FILENAMES = new Set([
  "package-lock.json", "yarn.lock", "bun.lock", "pnpm-lock.yaml",
  "composer.lock", "Gemfile.lock", "Cargo.lock",
  ".DS_Store", "Thumbs.db", "desktop.ini",
  "tsconfig.tsbuildinfo",
]);

// ── Mask .env values — keeps keys, replaces values with <VALUE> ──────────────
function maskEnvContent(content) {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      // Keep blank lines, comments, and export-only lines unchanged
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return line;
      const eqIdx = line.indexOf("=");
      const key   = line.slice(0, eqIdx + 1);
      return `${key}<VALUE>`;
    })
    .join("\n");
}

// ── Recursively collect files skipping ignored dirs ───────────────────────────
function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // Skip ignored directories
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) results.push(...collectFiles(join(dir, entry.name)));
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
console.log(`Collecting ${filePaths.length} files…`);

const files = filePaths.map((absPath) => {
  const filePath = relative(ROOT, absPath).replace(/\\/g, "/");
  const isEnvFile = ENV_BASENAME_RE.test(basename(filePath));

  let content = readFileSync(absPath, "utf-8");
  if (isEnvFile) content = maskEnvContent(content); // strip real secrets

  return { filePath, content };
});

// ── Sync ──────────────────────────────────────────────────────────────────────
const res = await fetch(`${API_BASE}/api/v1/projects/${PROJECT_ID}/sync`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type":  "application/json",
  },
  body: JSON.stringify({
    files,
    commitHash: execSync("git rev-parse HEAD").toString().trim(),
    branch:     execSync("git branch --show-current").toString().trim(),
  }),
});

const json = await res.json();
console.log(json.message);
// → "Sync complete: 42 sections created, 7 updated."
```

---

## File Filtering & .env Safety

### What gets ignored

The sync script skips directories and files that are **not user-created**:

| Category | Examples |
|---|---|
| Package managers | `node_modules/`, `vendor/`, `.yarn/`, `Pods/` |
| Build outputs | `dist/`, `build/`, `out/`, `.next/`, `.nuxt/` |
| Test & coverage | `coverage/`, `.nyc_output/` |
| Caches | `.turbo/`, `.cache/`, `.parcel-cache/` |
| Python envs | `venv/`, `.venv/`, `__pycache__/` |
| Other runtimes | `.gradle/`, `target/` (Maven), `bin/`, `obj/` (.NET) |
| VCS | `.git/`, `.svn/` |
| Lock files | `package-lock.json`, `yarn.lock`, `bun.lock`, `pnpm-lock.yaml` |
| IDE artefacts | `.idea/`, `.vscode/`, `tsconfig.tsbuildinfo` |

Only files with **known source-code extensions** are included — binaries,
minified assets, and unknown formats are skipped by default.

### .env file handling

`.env` files **are included** in the sync (they document what configuration
your project expects) but all values are replaced with `<VALUE>` so no real
secrets ever leave your machine.

Example — original `.env`:

```
DATABASE_URL=postgresql://user:password@host:5432/mydb
NEXTAUTH_SECRET=super-secret-key-123
NEXT_PUBLIC_API_URL=https://api.example.com
```

What gets sent to OnTap Dev:

```
DATABASE_URL=<VALUE>
NEXTAUTH_SECRET=<VALUE>
NEXT_PUBLIC_API_URL=<VALUE>
```

Comments and blank lines are preserved as-is. Only lines containing `=` have their value replaced.

### Extending the ignore list

To skip additional directories (e.g. a `generated/` folder in your project),
add them to `IGNORE_DIRS` in `sync-docs.mjs`:

```js
const IGNORE_DIRS = new Set([
  // … existing entries …
  "generated",   // your custom generated folder
  "storybook-static",
]);
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/sync-docs.yml
name: Sync Documentation

on:
  push:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Sync docs to OnTap Dev
        env:
          ONTAP_API_KEY: ${{ secrets.ONTAP_API_KEY }}
          ONTAP_PROJECT_ID: ${{ secrets.ONTAP_PROJECT_ID }}
        run: node sync-docs.mjs
```

Store `ONTAP_API_KEY` and `ONTAP_PROJECT_ID` in **GitHub → Repository → Settings → Secrets and variables → Actions**.

### GitLab CI

```yaml
# .gitlab-ci.yml
sync-docs:
  stage: deploy
  only:
    - main
  script:
    - node sync-docs.mjs
  variables:
    ONTAP_API_KEY: $ONTAP_API_KEY
    ONTAP_PROJECT_ID: $ONTAP_PROJECT_ID
```

---

## Response Format

### Success (`200 OK`)

```json
{
  "success": true,
  "message": "Sync complete: 5 sections created, 2 updated.",
  "data": {
    "snapshotId": "clx9abc123",
    "filesProcessed": 7,
    "sectionsCreated": 5,
    "sectionsUpdated": 2,
    "status": "COMPLETED"
  }
}
```

### Error responses

| Status | Cause |
|--------|-------|
| `401 Unauthorized` | Missing, invalid, revoked, or expired API key |
| `403 Forbidden` | API key lacks the `sync` scope, or project belongs to a different user |
| `404 Not Found` | Project ID does not exist |
| `400 Bad Request` | Invalid payload (see `error` field for details) |
| `500 Internal Server Error` | Server-side error |

Error body shape:

```json
{
  "success": false,
  "error": "API key lacks the 'sync' scope."
}
```

---

## Limits & Constraints

| Constraint | Limit |
|------------|-------|
| Files per sync request | 500 |
| Active API keys per user | 10 |
| File path length | 500 characters |
| Key format | `ontap_` + 48 hex chars = 54 chars total |
| Key prefix (display) | First 8 hex chars after `ontap_` |
| Symbols per file | No hard limit (reasonable use expected) |
