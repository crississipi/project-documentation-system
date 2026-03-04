import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, hasScope, logApiUsage } from "@/lib/apiKeyAuth";
import { syncPayloadSchema } from "@/lib/validations";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/utils";
import type { SyncResult, SyncFilePayload } from "@/types";

type Params = { params: Promise<{ id: string }> };

// ─── POST /api/v1/projects/[id]/sync ──────────────────────
// Accepts an array of files, auto-creates one Section per file,
// populates content blocks with formatted HTML (headings, code blocks, etc.)
export async function POST(request: NextRequest, { params }: Params) {
  const apiKeySession = await authenticateApiKey(request);
  if (!apiKeySession) return unauthorized("Invalid or missing API key.");
  if (!hasScope(apiKeySession, "sync") && !hasScope(apiKeySession, "*")) {
    return forbidden("API key lacks the 'sync' scope.");
  }

  const { id: projectId } = await params;
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  try {
    // Verify project exists and belongs to user
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      logApiUsage(apiKeySession.apiKeyId, `/api/v1/projects/${projectId}/sync`, "POST", 404, ip);
      return notFound("Project not found.");
    }
    if (project.authorId !== apiKeySession.userId) {
      logApiUsage(apiKeySession.apiKeyId, `/api/v1/projects/${projectId}/sync`, "POST", 403, ip);
      return forbidden("You do not own this project.");
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = syncPayloadSchema.safeParse(body);
    if (!parsed.success) {
      logApiUsage(apiKeySession.apiKeyId, `/api/v1/projects/${projectId}/sync`, "POST", 400, ip);
      return badRequest(parsed.error.issues[0].message);
    }

    const { files, commitHash, branch } = parsed.data;

    // Create a snapshot record
    const snapshot = await prisma.docSnapshot.create({
      data: {
        projectId,
        commitHash: commitHash ?? null,
        branch: branch ?? null,
        totalFiles: files.length,
        status: "PROCESSING",
      },
    });

    let sectionsCreated = 0;
    let sectionsUpdated = 0;

    // Get existing sections for this project (to find matches by title)
    const existingSections = await prisma.section.findMany({
      where: { projectId },
      select: { id: true, title: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    });
    const sectionMap = new Map(existingSections.map((s) => [s.title, s]));

    // Determine next order index
    let nextOrderIndex = existingSections.length > 0
      ? Math.max(...existingSections.map((s) => s.orderIndex)) + 1
      : 0;

    for (const file of files) {
      const sectionTitle = filePathToSectionTitle(file.filePath);
      const htmlContent = fileToHtml(file);

      // Compute file hash if not provided
      const fileHash = file.fileHash ?? await computeHash(file.content);

      let sectionId: string;
      const existing = sectionMap.get(sectionTitle);

      if (existing) {
        // Update existing section's content
        sectionId = existing.id;

        // Delete old blocks & replace
        await prisma.contentBlock.deleteMany({ where: { sectionId } });
        await prisma.contentBlock.create({
          data: {
            sectionId,
            type: "TEXT",
            content: htmlContent,
            orderIndex: 0,
          },
        });
        sectionsUpdated++;
      } else {
        // Create new section
        const section = await prisma.section.create({
          data: {
            projectId,
            title: sectionTitle,
            orderIndex: nextOrderIndex++,
          },
        });
        sectionId = section.id;
        sectionMap.set(sectionTitle, { id: sectionId, title: sectionTitle, orderIndex: section.orderIndex });

        await prisma.contentBlock.create({
          data: {
            sectionId,
            type: "TEXT",
            content: htmlContent,
            orderIndex: 0,
          },
        });
        sectionsCreated++;
      }

      // Record the file in the snapshot
      const docFile = await prisma.docFile.create({
        data: {
          snapshotId: snapshot.id,
          filePath: file.filePath,
          fileHash,
          language: file.language ?? detectLanguage(file.filePath),
          sectionId,
        },
      });

      // Record symbols if provided
      if (file.symbols && file.symbols.length > 0) {
        await prisma.docSymbol.createMany({
          data: file.symbols.map((sym) => ({
            docFileId: docFile.id,
            name: sym.name,
            kind: sym.kind,
            startLine: sym.startLine,
            endLine: sym.endLine,
            signature: sym.signature ?? null,
            docstring: sym.docstring ?? null,
          })),
        });
      }
    }

    // Mark snapshot complete
    await prisma.docSnapshot.update({
      where: { id: snapshot.id },
      data: { status: "COMPLETED" },
    });

    // Bump project version
    await prisma.project.update({
      where: { id: projectId },
      data: { versionNumber: { increment: 1 } },
    });

    const result: SyncResult = {
      snapshotId: snapshot.id,
      filesProcessed: files.length,
      sectionsCreated,
      sectionsUpdated,
      status: "COMPLETED",
    };

    logApiUsage(apiKeySession.apiKeyId, `/api/v1/projects/${projectId}/sync`, "POST", 200, ip);
    return ok(result, `Sync complete: ${sectionsCreated} sections created, ${sectionsUpdated} updated.`);
  } catch (err) {
    console.error("[POST /api/v1/projects/:id/sync]", err);
    // Mark snapshot as failed if it exists
    logApiUsage(apiKeySession.apiKeyId, `/api/v1/projects/${projectId}/sync`, "POST", 500, ip);
    return serverError();
  }
}

// ───────────────────────────────────────────────────
// Helper functions
// ───────────────────────────────────────────────────

/** Convert a file path to a human-readable section title */
function filePathToSectionTitle(filePath: string): string {
  // "src/components/Button.tsx" → "Button.tsx"
  const fileName = filePath.split("/").pop() ?? filePath;
  return fileName;
}

/** Detect programming language from file extension */
function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const langMap: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
    php: "php", swift: "swift", kt: "kotlin", scala: "scala",
    sql: "sql", sh: "bash", bash: "bash", zsh: "bash",
    yml: "yaml", yaml: "yaml", json: "json", xml: "xml",
    html: "html", css: "css", scss: "scss", less: "less",
    md: "markdown", txt: "plaintext", toml: "toml", ini: "ini",
    dockerfile: "docker", makefile: "makefile",
  };
  return langMap[ext] ?? "plaintext";
}

/** SHA-256 hash of content */
async function computeHash(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Escape HTML special characters */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert a file's content + symbols into formatted TipTap-compatible HTML.
 *
 * Heading hierarchy (matches professional documentation standards):
 *   Section title is H2 (rendered by ContentPage) — we do NOT duplicate it.
 *   <p><em>path/to/file</em> · language</p>
 *   <hr>
 *   For each symbol:
 *     <h3 id="sym-symbolName">symbolName</h3>
 *     <p>kind · lines startLine–endLine</p>
 *     <blockquote>docstring (with [see: X] converted to links)</blockquote>
 *     <pre><code class="language-xxx">source body</code></pre>
 *   If no symbols, just wrap full content in a code block.
 */
function fileToHtml(file: SyncFilePayload): string {
  const lang = file.language ?? detectLanguage(file.filePath);
  const parts: string[] = [];

  // Collect all symbol names in this file for intra-file anchor links
  const symbolNames = new Set(
    (file.symbols ?? []).map((s) => s.name)
  );

  // File path + language subheading (section title is already rendered by UI)
  parts.push(`<p><em>${escapeHtml(file.filePath)}</em> · ${escapeHtml(lang)}</p>`);
  parts.push("<hr>");

  if (file.symbols && file.symbols.length > 0) {
    // Split content into lines for extracting symbol bodies
    const lines = file.content.split("\n");

    for (const sym of file.symbols) {
      // Anchor id for navigation — sanitised to avoid collisions
      const anchorId = `sym-${sym.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      parts.push(`<h3 id="${anchorId}">${escapeHtml(sym.name)}</h3>`);
      parts.push(`<p><strong>${escapeHtml(sym.kind)}</strong> · lines ${sym.startLine}–${sym.endLine}</p>`);

      if (sym.docstring) {
        // Convert [see: NAME] markers to navigable anchor links
        const docHtml = convertSeeLinks(escapeHtml(sym.docstring), symbolNames);
        parts.push(`<blockquote><p>${docHtml}</p></blockquote>`);
      }

      // Extract the body from source
      const bodyLines = lines.slice(
        Math.max(0, sym.startLine - 1),
        Math.min(lines.length, sym.endLine)
      );
      if (bodyLines.length > 0 && bodyLines.length <= 100) {
        parts.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(bodyLines.join("\n"))}</code></pre>`);
      } else if (bodyLines.length > 100) {
        // Truncate very long bodies
        const truncated = bodyLines.slice(0, 100).join("\n") + "\n// ... truncated";
        parts.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(truncated)}</code></pre>`);
      }
    }
  } else {
    // No symbols — just wrap the entire file content in a code block
    const content = file.content.length > 50000
      ? file.content.slice(0, 50000) + "\n// ... truncated (file too large)"
      : file.content;
    parts.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(content)}</code></pre>`);
  }

  return parts.join("");
}

/**
 * Convert [see: NAME] markers in an already-escaped docstring into
 * clickable anchor links pointing to #sym-NAME.
 *
 * If the name matches a symbol in the same file it becomes an in-page
 * anchor; otherwise it stays as styled text so readers know it refers to
 * another file.
 */
function convertSeeLinks(escapedHtml: string, localSymbols: Set<string>): string {
  // Pattern matches the escaped form: [see: NAME]
  // After escapeHtml, brackets are still plain [] but &amp;/&lt; etc. may appear in names
  return escapedHtml.replace(
    /\[see:\s*([^\]]+)\]/g,
    (_match, rawName) => {
      const name = rawName.trim();
      const anchor = `sym-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      if (localSymbols.has(name)) {
        // In-page link
        return `<a href="#${anchor}" style="color:#7c3aed;text-decoration:underline;font-weight:500">${escapeHtml(name)}</a>`;
      }
      // Cross-file reference (no anchor target in this section — render as styled text)
      return `<strong style="color:#7c3aed">${escapeHtml(name)}</strong>`;
    }
  );
}
