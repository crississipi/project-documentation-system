"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BiFolderPlus, BiSearch, BiFilter, BiX, BiSortAlt2,
  BiChevronDown, BiRefresh,
} from "react-icons/bi";
import { ProjectCard } from "@/app/components/projects/ProjectCard";
import { NewProjectModal } from "@/app/components/projects/NewProjectModal";
import { Button } from "@/app/components/ui/Button";
import type { ProjectSummary } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  "Web Application", "Mobile Application", "API / Backend",
  "E-Commerce", "SaaS Platform", "Desktop Application", "Data Science / ML",
];

const SORT_OPTIONS = [
  { value: "newest",   label: "Newest first" },
  { value: "oldest",   label: "Oldest first" },
  { value: "az",       label: "A → Z" },
  { value: "za",       label: "Z → A" },
  { value: "sections", label: "Most sections" },
  { value: "updated",  label: "Recently updated" },
];

const DOC_TYPES = [
  "Technical Documentation", "API Reference", "User Guide",
  "Architecture Document", "Runbook", "Release Notes", "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applySort(list: ProjectSummary[], sort: string): ProjectSummary[] {
  const s = [...list];
  switch (sort) {
    case "oldest":   return s.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "az":       return s.sort((a, b) => a.title.localeCompare(b.title));
    case "za":       return s.sort((a, b) => b.title.localeCompare(a.title));
    case "sections": return s.sort((a, b) => b.sectionCount - a.sectionCount);
    case "updated":  return s.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    default:         return s.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function toggleItem<T>(arr: T[], item: T, set: (v: T[]) => void) {
  set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Projects() {
  const router = useRouter();
  const [projects, setProjects]       = useState<ProjectSummary[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [categories, setCategories]     = useState<string[]>([]);
  const [visibility, setVisibility]     = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL");
  const [paperSizes, setPaperSizes]     = useState<string[]>([]);
  const [docTypes, setDocTypes]         = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort]                 = useState("newest");

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/projects");
      const json = await res.json();
      if (res.ok) setProjects(json.data ?? []);
      else        setError(json.error ?? "Failed to load projects");
    } catch { setError("Network error"); }
    finally   { setLoading(false); }
  };

  const handleCreated = (project: ProjectSummary) => {
    setProjects((p) => [project, ...p]);
    router.push(`/projects/${project.id}`);
  };

  const handleDelete = (id: string) =>
    setProjects((p) => p.filter((pr) => pr.id !== id));

  // ── Derived collections ───────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  const presentCategories = useMemo(() => {
    const set = new Set(projects.map((p) => p.category));
    return ALL_CATEGORIES.filter((c) => set.has(c));
  }, [projects]);

  const presentPaperSizes = useMemo(
    () => Array.from(new Set(projects.map((p) => p.paperSize))).sort(),
    [projects]
  );

  const presentDocTypes = useMemo(() => {
    const set = new Set(projects.map((p) => p.docType));
    return DOC_TYPES.filter((d) => set.has(d));
  }, [projects]);

  // ── Active filter count ───────────────────────────────────────────────────
  const activeFilterCount =
    categories.length +
    (visibility !== "ALL" ? 1 : 0) +
    paperSizes.length +
    docTypes.length +
    selectedTags.length;

  const clearFilters = () => {
    setCategories([]); setVisibility("ALL"); setPaperSizes([]);
    setDocTypes([]); setSelectedTags([]); setSearch("");
  };

  // ── Filtered + sorted result ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...projects];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.docType.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categories.length)    list = list.filter((p) => categories.includes(p.category));
    if (visibility !== "ALL") list = list.filter((p) => p.visibility === visibility);
    if (paperSizes.length)    list = list.filter((p) => paperSizes.includes(p.paperSize));
    if (docTypes.length)      list = list.filter((p) => docTypes.includes(p.docType));
    if (selectedTags.length)  list = list.filter((p) => selectedTags.every((t) => p.tags.includes(t)));
    return applySort(list, sort);
  }, [projects, search, categories, visibility, paperSizes, docTypes, selectedTags, sort]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col bg-zinc-100 overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-4 sm:px-8 sm:pt-6 bg-zinc-100 shrink-0">
        {/* Heading row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {loading
                ? "Loading…"
                : `${filtered.length} of ${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2 self-start sm:self-auto sm:shrink-0">
            <BiFolderPlus className="text-lg" /> New Project
          </Button>
        </div>

        {/* Search + sort + filter toggle row */}
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input
              type="text"
              placeholder="Search by title, category, tag, doc type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 bg-white shadow-sm"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <BiX />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-8 pr-7 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-violet-400 shadow-sm cursor-pointer font-medium text-slate-700"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <BiSortAlt2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none" />
            <BiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-xl shadow-sm transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"
            }`}
          >
            <BiFilter className="text-base" />
            Filters
            {activeFilterCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                showFilters ? "bg-white text-violet-600" : "bg-violet-100 text-violet-700"
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear */}
          {(activeFilterCount > 0 || search) && (
            <button type="button" onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-500 border border-slate-200 bg-white rounded-xl shadow-sm transition-colors">
              <BiRefresh /> Clear
            </button>
          )}
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

            {/* Category */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {presentCategories.length === 0
                  ? <p className="text-xs text-slate-400">No categories yet</p>
                  : presentCategories.map((cat) => (
                    <button key={cat} type="button"
                      onClick={() => toggleItem(categories, cat, setCategories)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        categories.includes(cat)
                          ? "bg-violet-600 text-white border-violet-600"
                          : "border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
                      }`}>
                      {cat}
                    </button>
                  ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Visibility</p>
              <div className="flex gap-1.5">
                {(["ALL", "PUBLIC", "PRIVATE"] as const).map((v) => (
                  <button key={v} type="button"
                    onClick={() => setVisibility(v)}
                    className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                      visibility === v
                        ? "bg-violet-600 text-white border-violet-600"
                        : "border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
                    }`}>
                    {v === "ALL" ? "All" : v === "PUBLIC" ? "Public" : "Private"}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper size */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Paper Size</p>
              <div className="flex gap-1.5 flex-wrap">
                {presentPaperSizes.length === 0
                  ? <p className="text-xs text-slate-400">No sizes yet</p>
                  : presentPaperSizes.map((ps) => (
                    <button key={ps} type="button"
                      onClick={() => toggleItem(paperSizes, ps, setPaperSizes)}
                      className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                        paperSizes.includes(ps)
                          ? "bg-violet-600 text-white border-violet-600"
                          : "border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
                      }`}>
                      {ps}
                    </button>
                  ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {allTags.length === 0
                  ? <p className="text-xs text-slate-400">No tags yet</p>
                  : allTags.map((tag) => (
                    <button key={tag} type="button"
                      onClick={() => toggleItem(selectedTags, tag, setSelectedTags)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                      }`}>
                      #{tag}
                    </button>
                  ))}
              </div>
            </div>

            {/* Doc type — full-width row */}
            {presentDocTypes.length > 0 && (
              <div className="md:col-span-2 xl:col-span-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Doc Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {presentDocTypes.map((dt) => (
                    <button key={dt} type="button"
                      onClick={() => toggleItem(docTypes, dt, setDocTypes)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        docTypes.includes(dt)
                          ? "bg-teal-600 text-white border-teal-600"
                          : "border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700"
                      }`}>
                      {dt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active filter chips (shown when panel is collapsed) */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {categories.map((c) => (
              <FilterChip key={c} label={c}
                onRemove={() => toggleItem(categories, c, setCategories)} />
            ))}
            {visibility !== "ALL" && (
              <FilterChip label={visibility} onRemove={() => setVisibility("ALL")} />
            )}
            {paperSizes.map((p) => (
              <FilterChip key={p} label={p}
                onRemove={() => toggleItem(paperSizes, p, setPaperSizes)} />
            ))}
            {docTypes.map((d) => (
              <FilterChip key={d} label={d}
                onRemove={() => toggleItem(docTypes, d, setDocTypes)} />
            ))}
            {selectedTags.map((t) => (
              <FilterChip key={t} label={`#${t}`}
                onRemove={() => toggleItem(selectedTags, t, setSelectedTags)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Project grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <p className="text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchProjects}>Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
              <BiFolderPlus className="text-3xl text-violet-500" />
            </div>
            <div>
              <p className="font-medium text-slate-700">
                {projects.length === 0 ? "No projects yet" : "No projects match your filters"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {projects.length === 0
                  ? "Create your first project to get started"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
            {projects.length === 0 ? (
              <Button onClick={() => setShowModal(true)}>Create Project</Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <NewProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-violet-900">
        <BiX className="text-sm" />
      </button>
    </span>
  );
}
