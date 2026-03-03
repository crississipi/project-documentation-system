"use client";

import type { CoAuthor } from "@/types";
import { formatDate } from "@/lib/utils";

interface CoverPageProps {
  title: string;
  author: string;
  createdAt: string;
  description?: string | null;
  docType: string;
  paperSize: "A4" | "LEGAL" | "LONG";
  coAuthors?: CoAuthor[];
}

const PAPER_DIMENSIONS: Record<string, { width: string; minHeight: string }> = {
  A4: { width: "794px", minHeight: "1123px" },
  LEGAL: { width: "816px", minHeight: "1344px" },
  LONG: { width: "816px", minHeight: "1248px" },
};

export function CoverPage({ title, author, createdAt, description, docType, paperSize, coAuthors = [] }: CoverPageProps) {
  const dims = PAPER_DIMENSIONS[paperSize] ?? PAPER_DIMENSIONS.A4;

  return (
    <div
      className="doc-page bg-white shadow-md mx-auto mb-6 flex flex-col relative overflow-hidden"
      style={{ width: dims.width, minHeight: dims.minHeight }}
    >
      {/* Decorative top border */}
      <div className="w-full h-2 bg-gradient-to-r from-violet-500 to-indigo-500" />

      {/* Cover content */}
      <div className="flex-1 flex flex-col items-center justify-center px-20 py-16 text-center">
        {/* Doc type label */}
        <span className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-8">
          {docType}
        </span>

        {/* Title */}
        <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-6 max-w-lg">
          {title}
        </h1>

        {/* Divider */}
        <div className="w-24 h-0.5 bg-gradient-to-r from-violet-400 to-indigo-400 mb-6" />

        {/* Description */}
        {description && (
          <p className="text-slate-500 text-base max-w-md leading-relaxed mb-10">{description}</p>
        )}

        {/* Meta */}
        <div className="flex flex-col items-center gap-1 text-sm text-slate-400 mt-auto">
          <p>
            <span className="font-medium text-slate-600">Author:</span> {author}
          </p>
          {coAuthors.length > 0 && (
            <p>
              <span className="font-medium text-slate-600">Co-Authors:</span>{" "}
              {coAuthors.map((ca) => ca.name).join(", ")}
            </p>
          )}
          <p>
            <span className="font-medium text-slate-600">Date:</span> {formatDate(createdAt)}
          </p>
        </div>
      </div>

      {/* Footer - hidden during PDF capture; redrawn by jsPDF at fixed bottom position */}
      <div
        className="w-full px-12 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400"
        data-pdf-footer="true"
        data-footer-left="OnTap Dev Documentation"
        data-footer-right="Page 1"
      >
        <span>OnTap Dev Documentation</span>
        <span>Page 1</span>
      </div>
    </div>
  );
}
