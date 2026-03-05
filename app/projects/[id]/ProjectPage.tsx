"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { DocumentationView } from "@/app/components/documentation/DocumentationView";
import { apiFetch } from "@/lib/apiFetch";
import type { DocumentationPageData, ProjectCollaboratorData, CoAuthor } from "@/types";

/**
 * Reliably extract the project id from the current URL.
 *
 * When Next.js serves the static shell built for the placeholder `_` param,
 * `useParams()` may return `{ id: "_" }` before the client router syncs with
 * the real URL path. `usePathname()` always reflects the actual browser URL
 * (e.g. /projects/abc-123), so we use it as the authoritative source and
 * fall back to `useParams()` only when no better value is available.
 */
function useProjectId(): string | null {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();

  // Extract from pathname: /projects/<id>
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const fromPath = segments[0] === "projects" ? (segments[1] ?? null) : null;

  if (fromPath && fromPath !== "_") return fromPath;
  if (params?.id && params.id !== "_") return params.id;
  return fromPath ?? params?.id ?? null;
}

export default function ProjectPage() {
  const id = useProjectId();
  const router = useRouter();
  const [data, setData] = useState<DocumentationPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === "_") return;

    // Reset state on every new id so stale errors don't linger
    setLoading(true);
    setError(null);
    setData(null);

    async function load() {
      try {
        const [projRes, collabRes] = await Promise.all([
          apiFetch(`/api/projects/${id}`),
          apiFetch(`/api/projects/${id}/collaborators`),
        ]);

        if (projRes.status === 401) {
          router.replace("/login");
          return;
        }
        if (projRes.status === 404) {
          setError("Project not found.");
          setLoading(false);
          return;
        }
        if (!projRes.ok) {
          setError("Failed to load project.");
          setLoading(false);
          return;
        }

        const projJson = await projRes.json();
        const collabJson = collabRes.ok ? await collabRes.json() : { data: [] };
        const project = projJson.data;
        const collaborators: ProjectCollaboratorData[] = collabJson.data ?? [];

        setData({
          project: {
            id: project.id,
            title: project.title,
            description: project.description,
            category: project.category,
            tags: project.tags,
            visibility: project.visibility,
            docType: project.docType,
            paperSize: project.paperSize,
            docFlow: project.docFlow,
            authorId: project.authorId,
            authorName: project.authorName,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            versionNumber: project.versionNumber,
            sectionCount: project.sectionCount,
          },
          sections: project.sections,
          collaborators,
          coAuthors: collaborators
            .filter((c) => c.status === "ACCEPTED" && c.hasEdited && c.invitedName)
            .map((c): CoAuthor => ({ name: c.invitedName!, email: c.invitedEmail })),
        });
      } catch {
        setError("Failed to load project.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return <DocumentationView data={data} />;
}
