"use client";

import { useCallback } from "react";
import type { SectionWithBlocks } from "@/types";
import { DocumentEditor } from "./DocumentEditor";

interface ContentPageProps {
  section: SectionWithBlocks;
  pageNumber: number;
  projectId: string;
  paperSize: "A4" | "LEGAL" | "LONG";
  onSave: (sectionId: string, html: string) => void;
}

const PAPER_DIMENSIONS: Record<string, { width: string; minHeight: string }> = {
  A4: { width: "794px", minHeight: "1123px" },
  LEGAL: { width: "816px", minHeight: "1344px" },
  LONG: { width: "816px", minHeight: "1248px" },
};

export function ContentPage({ section, pageNumber, projectId, paperSize, onSave }: ContentPageProps) {
  const dims = PAPER_DIMENSIONS[paperSize] ?? PAPER_DIMENSIONS.A4;

  // Merge all text blocks into one HTML string for the editor
  const initialContent = section.blocks
    .filter((b) => b.type === "TEXT" || b.type === "CODE")
    .map((b) => b.content)
    .join("") || "";

  const handleSave = useCallback(
    (sectionId: string, html: string) => {
      onSave(sectionId, html);
    },
    [onSave]
  );

  return (
    <div
      id={`section-${section.id}`}
      className="doc-page bg-white shadow-md mx-auto mb-6 flex flex-col"
      style={{ width: dims.width, minHeight: dims.minHeight }}
    >
      <div className="w-full h-0.5 bg-gradient-to-r from-violet-200 to-indigo-200" />

      <div className="flex-1 flex flex-col px-16 py-12" style={{ lineHeight: "1.5", fontSize: "12pt" }}>
        {/* Section Title */}
        <h2 className="text-xl font-bold text-slate-900 mb-6 pb-3 border-b border-slate-200">
          {section.title}
        </h2>

        {/* Editor */}
        <div className="flex-1">
          <DocumentEditor
            key={section.id}
            sectionId={section.id}
            projectId={projectId}
            initialContent={initialContent}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* Footer - hidden during PDF capture; redrawn by jsPDF at fixed bottom position */}
      <div
        className="w-full px-12 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400"
        data-pdf-footer="true"
        data-footer-left={section.title}
        data-footer-right={`Page ${pageNumber}`}
      >
        <span>{section.title}</span>
        <span>Page {pageNumber}</span>
      </div>
    </div>
  );
}
