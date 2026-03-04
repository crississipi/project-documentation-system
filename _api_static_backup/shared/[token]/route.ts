import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/utils";

type Params = { params: Promise<{ token: string }> };

// ── GET /api/shared/[token] ── public; no authentication required ─────────────
// Returns document content based on the shared link's permission settings.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const link = await prisma.sharedLink.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            paperSize: true,
            docType: true,
            sections: {
              orderBy: { orderIndex: "asc" },
              include: {
                blocks: {
                  where: { type: { in: ["TEXT", "CODE"] } },
                  orderBy: { orderIndex: "asc" },
                  select: { content: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    if (!link) return notFound("Shared link not found.");
    if (link.expiresAt && link.expiresAt < new Date()) {
      return badRequest("This shared link has expired.");
    }

    const sections = link.project.sections.map((s) => ({
      id: s.id,
      title: s.title,
      orderIndex: s.orderIndex,
      content: s.blocks.map((b) => b.content).join(""),
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        projectId: link.project.id,
        title: link.project.title,
        description: link.project.description ?? "",
        paperSize: link.project.paperSize,
        docType: link.project.docType,
        sections,
        permissions: {
          canView: true, // always true for shared links
          canEdit: link.canEdit,
          canComment: link.canComment,
          canDownload: link.canDownload,
        },
      },
    });

    // Allow any origin to read shared documents (they're intentionally public)
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    console.error("[GET /api/shared/[token]]", err);
    return serverError();
  }
}
