"use client";

import { useState } from "react";
import {
  BiX,
  BiInfoCircle,
  BiCopy,
  BiCheck,
  BiLock,
  BiGlobe,
  BiCalendar,
  BiUser,
  BiFile,
  BiFolder,
  BiTrash,
} from "react-icons/bi";
import type { ProjectSummary, ProjectVisibility, DocFlow } from "@/types";
import { apiFetch } from "@/lib/apiFetch";

const DOC_FLOW_LABELS: Record<DocFlow, string> = {
  CATEGORY: "By Category",
  CONNECTION: "By Connection",
  MODULE: "By Module (AI)",
  ALPHABETICAL: "Alphabetical",
  CUSTOM: "Custom (manual)",
};

const DOC_FLOW_DESCRIPTIONS: Record<DocFlow, string> = {
  CATEGORY: "Setup → Frontend → Backend → Testing → Other",
  CONNECTION: "Frontend → Backend API → Supporting Files",
  MODULE: "Files grouped by feature / module (AI-arranged)",
  ALPHABETICAL: "A-Z by file path",
  CUSTOM: "No auto-reordering on sync — manual order preserved",
};

interface ProjectInfoModalProps {
  project: ProjectSummary;
  onClose: () => void;
  onVisibilityChange: (visibility: ProjectVisibility) => void;
  onDocFlowChange?: (docFlow: DocFlow) => void;
  onDelete?: () => void;
}

export function ProjectInfoModal({ project, onClose, onVisibilityChange, onDocFlowChange, onDelete }: ProjectInfoModalProps) {
  const [copied, setCopied] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [changingDocFlow, setChangingDocFlow] = useState(false);
  const [docFlowError, setDocFlowError] = useState<string | null>(null);

  // ─── Copy project ID ──────────────────────────────
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(project.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = project.id;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Delete project ───────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        onClose();
        onDelete?.();
      } else {
        const json = await res.json().catch(() => ({}));
        setDeleteError(json.message ?? "Failed to delete project.");
        setDeleting(false);
      }
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeleting(false);
    }
  };

  // ─── Toggle visibility ──────────────────────────
  const handleToggleVisibility = async () => {
    const next: ProjectVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    setTogglingVisibility(true);
    setVisibilityError(null);
    try {
      const res = await apiFetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) {
        onVisibilityChange(next);
      } else {
        const json = await res.json().catch(() => ({}));
        setVisibilityError(json.message ?? "Failed to update visibility.");
      }
    } catch {
      setVisibilityError("Network error. Please try again.");
    } finally {
      setTogglingVisibility(false);
    }
  };

  // ─── Change documentation flow ──────────────────
  const handleDocFlowChange = async (newFlow: DocFlow) => {
    if (newFlow === project.docFlow) return;
    setChangingDocFlow(true);
    setDocFlowError(null);
    try {
      const res = await apiFetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docFlow: newFlow }),
      });
      if (res.ok) {
        onDocFlowChange?.(newFlow);
      } else {
        const json = await res.json().catch(() => ({}));
        setDocFlowError(json.message ?? "Failed to update documentation flow.");
      }
    } catch {
      setDocFlowError("Network error. Please try again.");
    } finally {
      setChangingDocFlow(false);
    }
  };

  const isPublic = project.visibility === "PUBLIC";

  const formattedCreated = new Date(project.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedUpdated = new Date(project.updatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BiInfoCircle className="text-violet-500 text-xl shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Project Info</h2>
              <p className="text-xs text-slate-400 mt-0.5">Details and settings for this project</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <BiX className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* ── Project ID ─────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Project ID</p>
            <button
              type="button"
              onClick={handleCopyId}
              title="Click to copy project ID"
              className="w-full flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 transition-colors group"
            >
              <span className="font-mono text-xs text-slate-700 truncate">{project.id}</span>
              <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-violet-600 transition-colors">
                {copied ? (
                  <>
                    <BiCheck className="text-green-500 text-base" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <BiCopy className="text-base" />
                    <span>Copy</span>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* ── Privacy ────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Visibility</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {isPublic ? (
                  <BiGlobe className="text-violet-500 text-lg shrink-0" />
                ) : (
                  <BiLock className="text-slate-500 text-lg shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {isPublic ? "Public" : "Private"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {isPublic
                      ? "Anyone with the link can view this project"
                      : "Only you and collaborators can access"}
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                disabled={togglingVisibility}
                onClick={handleToggleVisibility}
                className="relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                style={{ backgroundColor: isPublic ? "#7c3aed" : "#cbd5e1" }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: isPublic ? "translateX(20px)" : "translateX(0)" }}
                />
                {togglingVisibility && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
              </button>
            </div>

            {visibilityError && (
              <p className="mt-1.5 text-xs text-red-500">{visibilityError}</p>
            )}
          </div>

          {/* ── Documentation Flow ─────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Documentation Flow</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              {(Object.keys(DOC_FLOW_LABELS) as DocFlow[]).map((flow) => (
                <button
                  key={flow}
                  type="button"
                  disabled={changingDocFlow}
                  onClick={() => handleDocFlowChange(flow)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-slate-100 last:border-b-0 ${
                    project.docFlow === flow
                      ? "bg-violet-50"
                      : "hover:bg-slate-100"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    project.docFlow === flow ? "border-violet-600" : "border-slate-300"
                  }`}>
                    {project.docFlow === flow && (
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">{DOC_FLOW_LABELS[flow]}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{DOC_FLOW_DESCRIPTIONS[flow]}</p>
                  </div>
                </button>
              ))}
            </div>
            {changingDocFlow && (
              <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                Updating flow…
              </p>
            )}
            {docFlowError && (
              <p className="mt-1.5 text-xs text-red-500">{docFlowError}</p>
            )}
            <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
              Controls how synced files are ordered in this project. Changes take effect on the next sync.
            </p>
          </div>

          {/* ── Details ────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Details</p>
            <div className="space-y-0 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              <DetailRow icon={<BiFile className="text-slate-400" />} label="Title" value={project.title} />
              <DetailRow icon={<BiFolder className="text-slate-400" />} label="Category" value={project.category || "—"} />
              <DetailRow icon={<BiFile className="text-slate-400" />} label="Doc Type" value={project.docType} />
              <DetailRow icon={<BiFile className="text-slate-400" />} label="Paper Size" value={project.paperSize} />
              <DetailRow icon={<BiUser className="text-slate-400" />} label="Author" value={project.authorName} />
              <DetailRow icon={<BiCalendar className="text-slate-400" />} label="Created" value={formattedCreated} />
              <DetailRow icon={<BiCalendar className="text-slate-400" />} label="Last Updated" value={formattedUpdated} />
              <DetailRow
                icon={<BiFile className="text-slate-400" />}
                label="Version"
                value={`v${project.versionNumber}`}
              />
              <DetailRow
                icon={<BiFile className="text-slate-400" />}
                label="Sections"
                value={String(project.sectionCount)}
              />
              {project.tags.length > 0 && (
                <div className="flex items-start gap-3 px-4 py-3 bg-white">
                  <span className="mt-0.5 shrink-0 text-slate-400">
                    <BiFile />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {project.description && (
                <div className="px-4 py-3 bg-white">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{project.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Danger Zone ────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Danger Zone</p>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {!confirmDelete ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">Delete Project</p>
                    <p className="text-xs text-slate-500 mt-0.5">Permanently remove this project and all its content.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 h-7 text-xs font-medium rounded-lg bg-white border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <BiTrash className="text-sm" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-red-700">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deleting ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <BiTrash className="text-sm" aria-hidden="true" />
                      )}
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                      disabled={deleting}
                      className="px-3 h-7 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {deleteError && (
                    <p className="text-xs text-red-600">{deleteError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white">
      <span className="shrink-0 text-base">{icon}</span>
      <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
      <span className="text-xs text-slate-800 font-medium truncate">{value}</span>
    </div>
  );
}
