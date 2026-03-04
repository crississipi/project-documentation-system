"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { BiSearch, BiX } from "react-icons/bi";
import type { SectionWithBlocks } from "@/types";

interface SearchResult {
  sectionId: string;
  snippet: string;
  pageNumber: number;
}

interface DocSearchProps {
  sections: SectionWithBlocks[];
  onNavigate: (sectionId: string) => void;
}

/** Strip HTML tags and collapse whitespace to get plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a snippet centred around the first match.
 * Returns ~90 chars with leading/trailing ellipsis when truncated.
 */
function buildSnippet(text: string, query: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) {
    return text.length > 90 ? text.slice(0, 90) + "…" : text;
  }
  const HALF = 45;
  const start = Math.max(0, idx - HALF);
  const end = Math.min(text.length, idx + query.length + HALF);
  const snippet = text.slice(start, end);
  return (start > 0 ? "…" : "") + snippet + (end < text.length ? "…" : "");
}

export default function DocSearch({ sections, onNavigate }: DocSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Compute search results whenever query or sections change. */
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    if (q.length < 2) return [];

    const found: SearchResult[] = [];

    sections.forEach((section, index) => {
      const pageNumber = index + 3; // Cover=1, TOC=2, sections start at 3

      // 1. Search the section title
      if (section.title.toLowerCase().includes(q.toLowerCase())) {
        found.push({
          sectionId: section.id,
          snippet: buildSnippet(section.title, q),
          pageNumber,
        });
        return; // one result per section max (title match wins)
      }

      // 2. Search block content (plain text)
      for (const block of section.blocks) {
        const text = stripHtml(block.content ?? "");
        if (text.toLowerCase().includes(q.toLowerCase())) {
          found.push({
            sectionId: section.id,
            snippet: buildSnippet(text, q),
            pageNumber,
          });
          break; // one result per section
        }
      }
    });

    return found.slice(0, 10);
  }, [query, sections]);

  /** Open dropdown when there are results and query is long enough. */
  useEffect(() => {
    setOpen(query.trim().length >= 2 && results.length > 0);
  }, [query, results]);

  /** Close on outside click. */
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  /** Close on Escape. */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  function clear() {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleSelect(sectionId: string) {
    setOpen(false);
    setQuery("");
    onNavigate(sectionId);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      {/* Input */}
      <div className="flex items-center gap-1.5 h-7 px-2.5 border border-slate-200 rounded-lg bg-white text-xs focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200 transition-all">
        <BiSearch className="text-slate-400 shrink-0 text-sm" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setOpen(true)}
          placeholder="Search…"
          aria-label="Search documentation"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex-1 min-w-0 outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
          >
            <BiX className="text-sm" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul
          role="listbox"
          aria-label="Search results"
          className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1"
        >
          {results.map((result) => (
            <li key={result.sectionId} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // Use mousedown so the blur event on the input doesn't close the dropdown first
                  e.preventDefault();
                  handleSelect(result.sectionId);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-xs text-slate-700 truncate flex-1 leading-relaxed">
                  {result.snippet}
                </span>
                <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                  p.{result.pageNumber}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-3 px-3">
          <p className="text-xs text-slate-400 text-center">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
