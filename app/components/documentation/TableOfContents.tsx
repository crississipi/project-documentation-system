"use client";

import type { SectionWithBlocks } from "@/types";

interface TableOfContentsProps {
  sections: SectionWithBlocks[];
  paperSize: "A4" | "LEGAL" | "LONG";
  onNavigate: (sectionId: string) => void;
}

const PAPER_DIMENSIONS: Record<string, { width: string; minHeight: string }> = {
  A4: { width: "794px", minHeight: "1123px" },
  LEGAL: { width: "816px", minHeight: "1344px" },
  LONG: { width: "816px", minHeight: "1248px" },
};

export function TableOfContents({ sections, paperSize, onNavigate }: TableOfContentsProps) {
  const dims = PAPER_DIMENSIONS[paperSize] ?? PAPER_DIMENSIONS.A4;

  return (
    <div
      className="doc-page bg-white shadow-md mx-auto mb-6 flex flex-col"
      style={{ width: dims.width, minHeight: dims.minHeight }}
    >
      <div className="w-full h-2 bg-gradient-to-r from-violet-500 to-indigo-500" />

      <div className="px-16 py-12 flex-1">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Table of Contents</h2>
        <div className="w-16 h-0.5 bg-violet-400 mb-8" />

        {sections.length === 0 ? (
          <p className="text-slate-400 text-sm italic">
            No sections added yet. Add sections from the right panel.
          </p>
        ) : (
          <ol className="space-y-3">
            {sections.map((section, index) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(section.id)}
                  className="w-full flex items-center gap-3 group text-left"
                >
                  <span className="text-sm font-bold text-violet-500 w-8 shrink-0">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-slate-700 font-medium group-hover:text-violet-600 transition-colors text-sm">
                    {section.title}
                  </span>
                  <span className="flex-1 border-b border-dotted border-slate-300 h-0 mt-2.5 mx-2" />
                  <span className="text-xs text-slate-400 shrink-0">
                    pg. {index + 3}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div
        className="w-full px-12 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400"
        data-pdf-footer="true"
        data-footer-left="Table of Contents"
        data-footer-right="Page 2"
      >
        <span>Table of Contents</span>
        <span>Page 2</span>
      </div>
    </div>
  );
}
