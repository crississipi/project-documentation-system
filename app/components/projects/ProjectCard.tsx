"use client";

import { useRouter } from "next/navigation";
import { BiTrash, BiEditAlt, BiLock, BiGlobe } from "react-icons/bi";
import type { ProjectSummary } from "@/types";
import { formatDate } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectSummary;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Web Application": "bg-blue-100 text-blue-700",
  "Mobile Application": "bg-green-100 text-green-700",
  "API / Backend": "bg-purple-100 text-purple-700",
  "E-Commerce": "bg-orange-100 text-orange-700",
  "SaaS Platform": "bg-pink-100 text-pink-700",
  "Desktop Application": "bg-yellow-100 text-yellow-700",
  "Data Science / ML": "bg-teal-100 text-teal-700",
  default: "bg-slate-100 text-slate-700",
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const color = CATEGORY_COLORS[project.category] ?? CATEGORY_COLORS.default;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) onDelete(project.id);
  };

  return (
    <div
      role="article"
      aria-label={`Project: ${project.title}`}
      onClick={() => router.push(`/projects/${project.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/projects/${project.id}`); } }}
      tabIndex={0}
      className="group relative flex flex-col border border-slate-200 rounded-2xl bg-white hover:shadow-lg hover:border-violet-300 transition-all cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
    >
      {/* ── Cover-page preview thumbnail ── */}
      <div className="relative w-full h-36 overflow-hidden bg-white border-b border-slate-100 shrink-0">
        {/* Scaled replica of the CoverPage first page */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 794,
            transformOrigin: "top center",
            transform: "scale(0.38)",
            left: "50%",
            marginLeft: -397,
            top: 0,
          }}
        >
          {/* Gradient bar */}
          <div className="w-full h-2 bg-gradient-to-r from-violet-500 to-indigo-500" />
          {/* Cover content */}
          <div className="flex flex-col items-center justify-center px-20 pt-16 pb-8 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-6">
              {project.docType}
            </span>
            <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-5 max-w-lg">
              {project.title}
            </h1>
            <div className="w-24 h-0.5 bg-gradient-to-r from-violet-400 to-indigo-400 mb-5" />
            {project.description && (
              <p className="text-slate-500 text-base max-w-md leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
        </div>
        {/* Bottom fade so it blends into the card body */}
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>

      <div className="flex flex-col flex-1 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate text-sm">{project.title}</h3>
            {project.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{project.description}</p>
            )}
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${color}`}>
            {project.visibility === "PRIVATE" ? <BiLock className="text-xs" /> : <BiGlobe className="text-xs" />}
            {project.category}
          </span>
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="text-xs text-slate-400">+{project.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{project.sectionCount} section{project.sectionCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{formatDate(project.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              aria-label={`Edit ${project.title}`}
              onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`); }}
              className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-600 transition-colors"
            >
              <BiEditAlt className="text-base" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${project.title}`}
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
            >
              <BiTrash className="text-base" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
