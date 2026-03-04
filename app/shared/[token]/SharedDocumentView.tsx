"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BiLoaderAlt, BiErrorCircle, BiDownload, BiEdit,
  BiMessageRounded, BiLinkExternal, BiLock,
} from "react-icons/bi";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/app/context/AuthContext";
import { ExportPDFButton } from "@/app/components/documentation/ExportPDFButton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SharedSection {
  id: string;
  title: string;
  orderIndex: number;
  content: string; // HTML from TipTap
}

interface SharedProjectData {
  projectId: string;
  title: string;
  description: string;
  paperSize: "A4" | "LEGAL" | "LONG";
  docType: string;
  sections: SharedSection[];
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canComment: boolean;
    canDownload: boolean;
  };
}

const PAPER_DIMS: Record<string, { width: string; minHeight: string }> = {
  A4: { width: "794px", minHeight: "1123px" },
  LEGAL: { width: "816px", minHeight: "1344px" },
  LONG: { width: "816px", minHeight: "1248px" },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function SharedDocumentView() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const token = params?.token ?? "";

  const [data, setData] = useState<SharedProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/shared/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error ?? "This shared link is invalid or has expired.");
      })
      .catch(() => setError("Failed to load the document. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <BiLoaderAlt className="text-4xl text-violet-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading document…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
          <BiErrorCircle className="text-5xl text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Document Unavailable</h2>
          <p className="text-sm text-slate-500">
            {error || "This shared link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const dims = PAPER_DIMS[data.paperSize] ?? PAPER_DIMS.A4;
  const { permissions: perm } = data;

  // Build permission labels for the header banner
  const accessLevel = [
    "view",
    perm.canComment ? "comment" : null,
    perm.canEdit ? "edit" : null,
    perm.canDownload ? "download" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* ── Top bar ────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900 truncate">{data.title}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Shared document &middot; Access: <span className="font-medium text-violet-600">{accessLevel}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Edit / Comment — requires being signed in */}
            {(perm.canEdit || perm.canComment) && !user && (
              <button
                type="button"
                onClick={() => router.push(`/login?redirect=/shared/${token}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <BiLock className="text-sm" />
                Sign in to {perm.canEdit ? "edit" : "comment"}
              </button>
            )}
            {perm.canEdit && user && (
              <button
                type="button"
                onClick={() => router.push(`/projects/${data.projectId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-violet-200 text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
              >
                <BiEdit className="text-sm" />
                Open in editor
              </button>
            )}
            {perm.canDownload && (
              <ExportPDFButton
                projectTitle={data.title}
                contentAreaId="shared-doc-content"
                paperSize={data.paperSize}
              />
            )}
          </div>
        </div>

        {/* Permission info banner */}
        {!perm.canDownload && !perm.canEdit && !perm.canComment && (
          <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 text-center text-xs text-amber-700">
            <BiLock className="inline mr-1" />
            This document is shared in <strong>view-only</strong> mode.
          </div>
        )}
      </div>

      {/* ── Document pages ─────────────────────────────────────────────────────── */}
      <div id="shared-doc-content" className="py-8 px-4 overflow-x-auto">
        {data.sections.length === 0 ? (
          <div className="text-center text-slate-400 py-16">This document has no content yet.</div>
        ) : (
          data.sections.map((section, idx) => (
            <div
              key={section.id}
              className="doc-page bg-white shadow-md mx-auto mb-6 flex flex-col"
              style={{ width: dims.width, minHeight: dims.minHeight }}
            >
              {/* Top accent */}
              <div className="w-full h-0.5 bg-gradient-to-r from-violet-200 to-indigo-200 shrink-0" />

              {/* Content */}
              <div className="flex-1 px-16 py-12" style={{ lineHeight: "1.5", fontSize: "12pt" }}>
                <h2 className="text-xl font-bold text-slate-900 mb-6 pb-3 border-b border-slate-200 font-sans">
                  {section.title}
                </h2>
                <div
                  className="shared-doc-content"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: section.content || "<p class='text-slate-400 italic'>No content in this section.</p>" }}
                />
              </div>

              {/* Footer */}
              <div
                className="w-full px-12 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 shrink-0"
                data-pdf-footer="true"
                data-footer-left={section.title}
                data-footer-right={`Page ${idx + 1}`}
              >
                <span>{section.title}</span>
                <span>Page {idx + 1}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────────── */}
      <div className="text-center pb-8 text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <span>Powered by</span>
        <a
          href="/"
          className="text-violet-600 font-semibold hover:underline flex items-center gap-1"
        >
          OnTap Dev Documentation <BiLinkExternal className="text-xs" />
        </a>
      </div>
    </div>
  );
}
