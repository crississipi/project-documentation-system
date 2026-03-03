"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BiArrowBack, BiSave, BiShareAlt } from "react-icons/bi";
import { CoverPage } from "./CoverPage";
import { TableOfContents } from "./TableOfContents";
import { ContentPage } from "./ContentPage";
import { SectionsPanel } from "./SectionsPanel";
import { ExportPDFButton } from "./ExportPDFButton";
import { ShareModal } from "./ShareModal";
import { Button } from "@/app/components/ui/Button";
import type { DocumentationPageData, SectionWithBlocks, PaperSize } from "@/types";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/apiFetch";

interface DocumentationViewProps {
  data: DocumentationPageData;
}

const PAPER_LABELS: Record<PaperSize, string> = { A4: "A4", LEGAL: "Legal", LONG: "Long" };

export function DocumentationView({ data: initialData }: DocumentationViewProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialData.project);
  const [sections, setSections] = useState<SectionWithBlocks[]>(initialData.sections);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    initialData.sections[0]?.id ?? null
  );
  const [paperSize, setPaperSize] = useState<PaperSize>(initialData.project.paperSize);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [coAuthors, setCoAuthors] = useState(initialData.coAuthors);
  const [showSectionsPanel, setShowSectionsPanel] = useState(false);

  const pendingSaves = useRef<Map<string, string>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasPending, setHasPending] = useState(false);

  const flushSaves = useCallback(async () => {
    const pending = new Map(pendingSaves.current);
    if (pending.size === 0) return;
    pendingSaves.current.clear();
    setHasPending(false);
    setSaving(true);

    await Promise.all(
      Array.from(pending.entries()).map(([sectionId, html]) =>
        apiFetch(`/api/projects/${project.id}/sections/${sectionId}/content`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            blocks: [{ type: "TEXT", content: html, orderIndex: 0 }],
          }),
        })
      )
    );

    setSaving(false);
    setLastSaved(new Date());
  }, [project.id]);

  // Auto-save buffered content — waits 20 s of inactivity before persisting
  const handleContentChange = useCallback((sectionId: string, html: string) => {
    pendingSaves.current.set(sectionId, html);
    setHasPending(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSaves(), 20_000);
  }, [flushSaves]);

  // Flush on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); flushSaves(); }, [flushSaves]);

  const navigateToSection = (id: string) => {
    setActiveSectionId(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ─── Section CRUD ──────────────────────────────
  const createSection = async (title: string) => {
    const res = await apiFetch(`/api/projects/${project.id}/sections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    if (res.ok) {
      const newSection: SectionWithBlocks = { ...json.data, blocks: [] };
      setSections((prev) => [...prev, newSection]);
      setActiveSectionId(newSection.id);
    }
  };

  const deleteSection = async (id: string) => {
    const res = await apiFetch(`/api/projects/${project.id}/sections/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSections((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setActiveSectionId(next[0]?.id ?? null);
        return next;
      });
    }
  };

  const renameSection = async (id: string, title: string) => {
    const res = await apiFetch(`/api/projects/${project.id}/sections/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    if (res.ok) {
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: json.data.title } : s)));
    }
  };

  const moveSection = async (id: string, direction: "up" | "down") => {
    const index = sections.findIndex((s) => s.id === id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;

    const next = [...sections];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    // Update order indices
    const updated = next.map((s, i) => ({ ...s, orderIndex: i }));
    setSections(updated);

    // Persist both reordered sections
    await Promise.all([
      apiFetch(`/api/projects/${project.id}/sections/${next[index].id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderIndex: index }),
      }),
      apiFetch(`/api/projects/${project.id}/sections/${next[swapIndex].id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderIndex: swapIndex }),
      }),
    ]);
  };

  const changePaperSize = async (size: PaperSize) => {
    setPaperSize(size);
    await apiFetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paperSize: size }),
    });
  };

  return (
    <div className="w-full flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 shrink-0 gap-2">
        {/* Left */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            aria-label="Back to dashboard"
            onClick={() => router.push("/dashboard")}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <BiArrowBack aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-none truncate max-w-[120px] sm:max-w-none">{project.title}</p>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">v{project.versionNumber} · {project.docType}</p>
          </div>
        </div>

        {/* Center – Save status */}
        <div className="text-xs text-slate-400 hidden md:block">
          {saving ? (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              Saving…
            </span>
          ) : lastSaved ? (
            `Auto-saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          ) : (
            <span className="text-slate-300">Auto-saves after 20 s of inactivity</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Paper size toggle — hidden on small mobile */}
          <div className="hidden sm:flex items-center border border-slate-200 rounded-lg overflow-hidden">
            {(["A4", "LEGAL", "LONG"] as PaperSize[]).map((size) => (
              <button key={size} type="button" onClick={() => changePaperSize(size)}
                className={cn(
                  "px-3 h-7 text-xs font-medium transition-colors",
                  paperSize === size ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"
                )}>
                {PAPER_LABELS[size]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={flushSaves}
            aria-label="Save document"
            disabled={saving || !hasPending}
            className="flex items-center gap-1.5 px-3 h-7 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <BiSave className="text-sm" aria-hidden="true" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <ExportPDFButton projectTitle={project.title} contentAreaId="doc-scroll-area" paperSize={paperSize} />

          <button
            type="button"
            aria-label="Share document"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 h-7 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <BiShareAlt className="text-sm" aria-hidden="true" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Toggle sections panel on mobile */}
          <button
            type="button"
            aria-label={showSectionsPanel ? "Hide sections" : "Show sections"}
            aria-pressed={showSectionsPanel}
            onClick={() => setShowSectionsPanel((v) => !v)}
            className={`lg:hidden flex items-center justify-center w-7 h-7 text-xs font-medium rounded-lg border transition-colors ${
              showSectionsPanel
                ? "bg-violet-600 text-white border-violet-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Scrollable Document Area */}
        <div id="doc-scroll-area" className="flex-1 overflow-y-auto py-6 sm:py-8 px-2 sm:px-4">
          <CoverPage
            title={project.title}
            author={project.authorName}
            createdAt={project.createdAt}
            description={project.description}
            docType={project.docType}
            paperSize={paperSize}
            coAuthors={coAuthors}
          />

          <TableOfContents sections={sections} paperSize={paperSize} onNavigate={navigateToSection} />

          {sections.map((section, index) => (
            <ContentPage
              key={section.id}
              section={section}
              projectId={project.id}
              paperSize={paperSize}
              pageNumber={index + 3}
              onSave={handleContentChange}
            />
          ))}

          {sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
              <p className="text-lg font-medium mb-2">No content yet</p>
              <p className="text-sm">Add sections from the right panel to start writing.</p>
            </div>
          )}
        </div>

        {/* Sections Panel — always visible on large screens; slide-in overlay on mobile */}
        {/* Mobile overlay backdrop */}
        {showSectionsPanel && (
          <div
            className="lg:hidden fixed inset-0 z-20 bg-black/30"
            aria-hidden="true"
            onClick={() => setShowSectionsPanel(false)}
          />
        )}
        <div className={`
          fixed lg:relative inset-y-0 right-0 z-30
          w-64 shrink-0
          transition-transform duration-300 ease-in-out
          ${showSectionsPanel ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}>
        <SectionsPanel
          sections={sections}
          activeSectionId={activeSectionId}
          onSelectSection={navigateToSection}
          onCreateSection={createSection}
          onDeleteSection={deleteSection}
          onRenameSection={renameSection}
          onMoveSection={moveSection}
        />
        </div>{/* end slide wrapper */}
      </div>{/* end main content flex */}

      {showShare && (
        <ShareModal
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
