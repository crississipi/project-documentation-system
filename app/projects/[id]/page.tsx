import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { parseTags } from "@/lib/utils";
import { DocumentationView } from "@/app/components/documentation/DocumentationView";
import type { DocumentationPageData, SectionWithBlocks, ProjectCollaboratorData, CoAuthor } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
);

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { sub: string };
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDocumentationPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      sections: {
        orderBy: { orderIndex: "asc" },
        include: { blocks: { orderBy: { orderIndex: "asc" } } },
      },
      _count: { select: { sections: true } },
      collaborators: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  // Allow: owner, public project, or accepted collaborator
  const isOwner = project.authorId === session.sub;
  const isCollaborator = project.collaborators.some(
    (c) => c.userId === session.sub && c.status === "ACCEPTED"
  );
  if (!isOwner && project.visibility !== "PUBLIC" && !isCollaborator) {
    redirect("/dashboard");
  }

  const data: DocumentationPageData = {
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      tags: parseTags(project.tags),
      visibility: project.visibility as "PRIVATE" | "PUBLIC",
      docType: project.docType,
      paperSize: project.paperSize as "A4" | "LEGAL" | "LONG",
      authorId: project.authorId,
      authorName: project.author.name,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      versionNumber: project.versionNumber,
      sectionCount: project._count.sections,
    },
    sections: project.sections.map((s): SectionWithBlocks => ({
      id: s.id,
      projectId: s.projectId,
      title: s.title,
      orderIndex: s.orderIndex,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      blocks: s.blocks.map((b) => ({
        id: b.id,
        sectionId: b.sectionId,
        type: b.type as "TEXT" | "CODE" | "IMAGE" | "TABLE" | "DIVIDER",
        content: b.content,
        language: b.language,
        orderIndex: b.orderIndex,
      })),
    })),
    collaborators: project.collaborators.map((c): ProjectCollaboratorData => ({
      id: c.id,
      projectId: c.projectId,
      invitedEmail: c.invitedEmail,
      invitedName: c.invitedName,
      userId: c.userId,
      role: c.role as "VIEWER" | "COMMENTER" | "EDITOR",
      status: c.status as "PENDING" | "ACCEPTED",
      hasEdited: c.hasEdited,
      createdAt: c.createdAt.toISOString(),
    })),
    coAuthors: project.collaborators
      .filter((c) => c.status === "ACCEPTED" && c.hasEdited && c.invitedName)
      .map((c): CoAuthor => ({ name: c.invitedName!, email: c.invitedEmail })),
  };

  return (
    <DocumentationView data={data} />
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, select: { title: true } });
  return { title: project ? `${project.title} - OnTap Dev` : "Documentation - OnTap Dev" };
}
