"use client";

import { useState } from "react";
import { BiPlus, BiTrash, BiEditAlt, BiMenu, BiChevronUp, BiChevronDown } from "react-icons/bi";
import type { SectionWithBlocks } from "@/types";
import { cn } from "@/lib/cn";

interface SectionsPanelProps {
  sections: SectionWithBlocks[];
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  onCreateSection: (title: string) => void;
  onDeleteSection: (id: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onMoveSection: (id: string, direction: "up" | "down") => void;
}

export function SectionsPanel({
  sections,
  activeSectionId,
  onSelectSection,
  onCreateSection,
  onDeleteSection,
  onRenameSection,
  onMoveSection,
}: SectionsPanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    onCreateSection(t);
    setNewTitle("");
    setAdding(false);
  };

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const commitEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameSection(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 w-64 shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BiMenu className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Sections</span>
          <span className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">
            {sections.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-violet-100 text-violet-600 transition-colors"
          title="Add Section"
        >
          <BiPlus className="text-lg" />
        </button>
      </div>

      {/* Add Section Input */}
      {adding && (
        <div className="px-3 py-2 border-b border-slate-100 bg-violet-50">
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
            placeholder="Section title…"
            className="w-full text-sm px-3 py-1.5 rounded-lg border border-violet-300 focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={handleAdd}
              className="flex-1 text-xs py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
              Add
            </button>
            <button type="button" onClick={() => { setAdding(false); setNewTitle(""); }}
              className="flex-1 text-xs py-1 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-xs text-slate-400">No sections yet</p>
            <button type="button" onClick={() => setAdding(true)}
              className="mt-2 text-xs text-violet-600 hover:underline">
              + Add first section
            </button>
          </div>
        ) : (
          <ul>
            {sections.map((section, index) => (
              <li key={section.id}>
                {editingId === section.id ? (
                  <div className="px-3 py-2 bg-violet-50">
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") { setEditingId(null); }
                      }}
                      onBlur={commitEdit}
                      className="w-full text-sm px-2 py-1 rounded border border-violet-300 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-slate-100 transition-colors",
                      activeSectionId === section.id
                        ? "bg-violet-50 border-l-2 border-l-violet-500"
                        : "hover:bg-slate-50 border-l-2 border-l-transparent"
                    )}
                    onClick={() => onSelectSection(section.id)}
                  >
                    <span className="text-xs font-bold text-slate-400 w-5 shrink-0">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <span className={cn(
                      "flex-1 text-sm truncate",
                      activeSectionId === section.id ? "text-violet-700 font-medium" : "text-slate-700"
                    )}>
                      {section.title}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onMoveSection(section.id, "up"); }}
                        disabled={index === 0}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-violet-100 disabled:opacity-30 text-slate-500">
                        <BiChevronUp className="text-sm" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onMoveSection(section.id, "down"); }}
                        disabled={index === sections.length - 1}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-violet-100 disabled:opacity-30 text-slate-500">
                        <BiChevronDown className="text-sm" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(section.id, section.title); }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-violet-100 text-violet-600">
                        <BiEditAlt className="text-sm" />
                      </button>
                      <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete section "${section.title}"?`)) onDeleteSection(section.id);
                      }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-red-500">
                        <BiTrash className="text-sm" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
