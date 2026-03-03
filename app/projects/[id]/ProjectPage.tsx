"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DocumentationView } from "@/app/components/documentation/DocumentationView";
import { apiFetch } from "@/lib/apiFetch";
import type { DocumentationPageData, ProjectCollaboratorData, CoAuthor } from "@/types";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [data, setData] = useState<DocumentationPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

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
