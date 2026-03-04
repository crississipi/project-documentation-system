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

The sync script (`sync-docs.mjs`) includes a built-in AI pipeline powered by
[OpenRouter](https://openrouter.ai) that automatically generates professional
documentation for every symbol extracted from your codebase.

### Pipeline Overview

```
Your Codebase
     │
     │  Phase 1 — Extract symbols (regex-based, 10+ languages)
     ▼
Symbol Index   ←── Phase 2 — Build cross-reference map of all project symbols
     │
     │  Phase 3 — Send each symbol + full file context to OpenRouter AI
     ▼
Enriched Payload   (symbols now have docstrings + [see: NAME] links)
     │
     │  Phase 4 — POST to /api/v1/projects/{id}/sync
     ▼
TipTap HTML in OnTap Dev UI   ([see: NAME] → clickable anchor links)
```

### Supported Languages

Symbol extraction works for: **JavaScript/TypeScript**, **Python**, **Go**,
**Rust**, **Java**, **Kotlin**, **C#**, **C/C++**, **PHP**, **Ruby**.

The script uses regex-based extraction to detect:
- Functions, methods, constructors
- Classes, interfaces, structs, enums
- Type aliases, constants, variables
- Import statements (batched for efficiency)

### AI Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | For AI | — | Your OpenRouter API key (get one at [openrouter.ai/keys](https://openrouter.ai/keys)) |
| `OPENROUTER_MODEL` | No | `google/gemini-2.0-flash-001` | Any model available on OpenRouter |
| `AI_CONCURRENCY` | No | `3` | Number of parallel AI requests |
| `DRY_RUN` | No | — | Set to `1` to preview without syncing |

### Cross-Reference System

When the AI generates a docstring, it automatically detects references to other
symbols in your project. These are marked as `[see: symbolName]` in the
docstring text. The server converts these markers into **clickable anchor links**
in the rendered HTML, so you can jump between related symbols directly.

Example AI-generated docstring:

```
Validates user input and delegates to the authentication service.
Calls [see: hashPassword] to securely hash credentials before
passing them to [see: createSession] for session management.
```

In the documentation UI, `hashPassword` and `createSession` become clickable
links that scroll to those symbols' documentation.

### Graceful Fallback (No AI Key)

If `OPENROUTER_API_KEY` is not set, the script still works:
- Symbols are extracted and sent to the API
- Files are synced normally
- Docstrings are simply omitted
- You can add the key later and re-run to enrich existing docs

### HTML Output

The server converts each file payload into **TipTap-compatible HTML**:

### Without symbols (plain file)

```html
<h1>Button.tsx</h1>
<p><em>src/components/Button.tsx</em> · typescript</p>
<hr>
<pre><code class="language-typescript">…full file content…</code></pre>
```

### With symbols + AI docstrings

For every symbol in the `symbols` array the server generates:

```html
<h1>Button.tsx</h1>
<p><em>src/components/Button.tsx</em> · typescript</p>
<hr>

<h2 id="sym-Button">Button</h2>
<p><strong>function</strong> · lines 12–34</p>
<blockquote>
  A reusable button component that supports multiple variants.
  Accepts props defined in <a href="#sym-ButtonProps">ButtonProps</a>.
</blockquote>
<pre><code class="language-typescript">function Button(props: ButtonProps): JSX.Element</code></pre>

<h2 id="sym-ButtonProps">ButtonProps</h2>
<p><strong>interface</strong> · lines 1–11</p>
<blockquote>
  Props accepted by the <a href="#sym-Button">Button</a> component.
</blockquote>
<pre><code class="language-typescript">interface ButtonProps { … }</code></pre>
```

Note how `[see: ButtonProps]` in the docstring is converted to a clickable
`<a href="#sym-ButtonProps">` link, and each `<h2>` has a matching `id`
attribute for navigation.

The `docstring` field is the source of the **description block** rendered inside
`<blockquote>`. This is what appears as the human-readable explanation for each
symbol in the documentation UI.

### How docstrings are populated

The recommended approach is to use the **built-in AI pipeline** in
`sync-docs.mjs`. When `OPENROUTER_API_KEY` is set, the script automatically:

1. Extracts symbols from every source file (regex-based, multi-language)
2. Sends each symbol's code + full file context to OpenRouter
3. Receives a professional docstring following Typedoc/JSDoc/Doxygen/Sphinx patterns
4. Detects cross-references and inserts `[see: NAME]` markers

You can also source docstrings manually:

| Source | How |
|--------|-----|
| **AI (default)** | Set `OPENROUTER_API_KEY` — the sync script handles everything automatically |
| **JSDoc / TSDoc** | Parse `/** ... */` comments using `typedoc`, `jsdoc`, or `ts-morph` |
| **Python docstrings** | Use `ast.get_docstring()` or `inspect.getdoc()` |
| **Manual** | Write descriptions directly in your code comments |

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

### Node.js sync script (with AI documentation)

Download `sync-docs.mjs` from the OnTap Dev Settings page and place it in your
project root. The script handles the complete pipeline:

```bash
# Basic usage — syncs files without AI
ONTAP_API_KEY=ontap_xxx ONTAP_PROJECT_ID=your-uuid node sync-docs.mjs

# With AI documentation (recommended)
ONTAP_API_KEY=ontap_xxx \
ONTAP_PROJECT_ID=your-uuid \
OPENROUTER_API_KEY=sk-or-v1-xxx \
node sync-docs.mjs

# With custom model and concurrency
ONTAP_API_KEY=ontap_xxx \
ONTAP_PROJECT_ID=your-uuid \
OPENROUTER_API_KEY=sk-or-v1-xxx \
OPENROUTER_MODEL=anthropic/claude-sonnet-4 \
AI_CONCURRENCY=5 \
node sync-docs.mjs

# Dry run — preview extracted symbols without syncing
DRY_RUN=1 node sync-docs.mjs
```

The script:

1. **Walks** the project tree, skipping `node_modules`, build outputs, lock files, etc.
2. **Masks** `.env` values (keys kept, values replaced with `<VALUE>`)
3. **Extracts** symbols from 10+ languages using regex-based parsing
4. **Builds** a cross-reference index of all symbol names
5. **Generates** AI docstrings via OpenRouter (if key is set)
6. **Syncs** the enriched payload to OnTap Dev

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
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: node sync-docs.mjs
```

Store `ONTAP_API_KEY`, `ONTAP_PROJECT_ID`, and optionally `OPENROUTER_API_KEY`
in **GitHub → Repository → Settings → Secrets and variables → Actions**.

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
    OPENROUTER_API_KEY: $OPENROUTER_API_KEY
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
