"use client";

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import {
  BiBold, BiItalic, BiUnderline, BiStrikethrough,
  BiCode, BiCodeBlock, BiLink, BiUnlink,
  BiAlignLeft, BiAlignMiddle, BiAlignRight, BiAlignJustify,
  BiListOl, BiListUl, BiMinus, BiHighlight, BiUndo, BiRedo,
  BiSolidQuoteAltLeft,
} from "react-icons/bi";
import { cn } from "@/lib/cn";
import DocSearch from "./DocSearch";
import type { SectionWithBlocks } from "@/types";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({ onClick, active, title, children, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors shrink-0",
        active ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function VDivider() {
  return <div className="w-px self-stretch bg-slate-200 mx-1 shrink-0" />;
}

interface EditorToolbarProps {
  editor: Editor | null;
  sections: SectionWithBlocks[];
  onNavigate: (id: string) => void;
}

export function EditorToolbar({ editor, sections, onNavigate }: EditorToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setHeadingOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    return (
      <div
        data-pdf-hide="true"
        className="flex items-center justify-between w-full shrink-0 h-10 border-b border-slate-200 bg-white px-3 gap-2"
      >
        <span className="text-[10px] text-slate-300 whitespace-nowrap">
          Click a section to enable editing
        </span>
        <div className="shrink-0">
          <DocSearch sections={sections} onNavigate={onNavigate} />
        </div>
      </div>
    );
  }

  // Capture after null-guard so TypeScript knows `ed` is always non-null in JSX closures
  const ed = editor;

  const activeHeading = ([1, 2, 3, 4, 5, 6] as const).find(
    (level) => ed.isActive("heading", { level })
  );

  const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (url === null) return;
    if (url === "") {
      ed.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      data-pdf-hide="true"
      className="flex items-stretch w-full shrink-0 h-10 border-b border-slate-200 bg-white"
    >
      {/* Heading selector — kept OUTSIDE the overflow-x-auto strip so the dropdown is never clipped */}
      <div
        className="relative shrink-0 flex items-center px-1.5 border-r border-slate-100"
        ref={headingRef}
      >
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setHeadingOpen((v) => !v); }}
          className={cn(
            "flex items-center justify-center w-9 h-9 text-xs font-bold rounded-lg transition-colors",
            activeHeading ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"
          )}
        >
          {activeHeading ? `H${activeHeading}` : "H"}
        </button>

        {headingOpen && (
          <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 w-28">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                ed.chain().focus().setParagraph().run();
                setHeadingOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors",
                !activeHeading ? "bg-violet-50 text-violet-700 font-medium" : "text-slate-600"
              )}
            >
              Normal
            </button>
            {([1, 2, 3, 4, 5, 6] as const).map((level) => (
              <button
                key={level}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  ed.chain().focus().toggleHeading({ level }).run();
                  setHeadingOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors",
                  ed.isActive("heading", { level })
                    ? "bg-violet-50 text-violet-700 font-semibold"
                    : "text-slate-600"
                )}
              >
                H{level}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable button strip — horizontal scroll if viewport is narrow */}
      <div className="flex flex-row items-center gap-0.5 px-2 flex-1 overflow-x-auto">

        <ToolbarButton onClick={() => ed.chain().focus().undo().run()} title="Undo" disabled={!ed.can().undo()}>
          <BiUndo />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().redo().run()} title="Redo" disabled={!ed.can().redo()}>
          <BiRedo />
        </ToolbarButton>

        <VDivider />

        <ToolbarButton onClick={() => ed.chain().focus().toggleBold().run()} active={ed.isActive("bold")} title="Bold">
          <BiBold />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().toggleItalic().run()} active={ed.isActive("italic")} title="Italic">
          <BiItalic />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().toggleUnderline().run()} active={ed.isActive("underline")} title="Underline">
          <BiUnderline />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().toggleStrike().run()} active={ed.isActive("strike")} title="Strikethrough">
          <BiStrikethrough />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().toggleHighlight().run()} active={ed.isActive("highlight")} title="Highlight">
          <BiHighlight />
        </ToolbarButton>

        <VDivider />

        <ToolbarButton onClick={() => ed.chain().focus().setTextAlign("left").run()} active={ed.isActive({ textAlign: "left" })} title="Align Left">
          <BiAlignLeft />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().setTextAlign("center").run()} active={ed.isActive({ textAlign: "center" })} title="Center">
          <BiAlignMiddle />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().setTextAlign("right").run()} active={ed.isActive({ textAlign: "right" })} title="Align Right">
          <BiAlignRight />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().setTextAlign("justify").run()} active={ed.isActive({ textAlign: "justify" })} title="Justify">
          <BiAlignJustify />
        </ToolbarButton>

        <VDivider />

        <ToolbarButton onClick={() => ed.chain().focus().toggleBulletList().run()} active={ed.isActive("bulletList")} title="Bullet List">
          <BiListUl />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().toggleOrderedList().run()} active={ed.isActive("orderedList")} title="Numbered List">
          <BiListOl />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().toggleBlockquote().run()} active={ed.isActive("blockquote")} title="Blockquote">
          <BiSolidQuoteAltLeft />
        </ToolbarButton>

        <VDivider />

        <ToolbarButton onClick={() => ed.chain().focus().toggleCode().run()} active={ed.isActive("code")} title="Inline Code">
          <BiCode />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().toggleCodeBlock().run()} active={ed.isActive("codeBlock")} title="Code Block">
          <BiCodeBlock />
        </ToolbarButton>

        <VDivider />

        <ToolbarButton onClick={setLink} active={ed.isActive("link")} title="Add Link">
          <BiLink />
        </ToolbarButton>
        <ToolbarButton onClick={() => ed.chain().focus().unsetLink().run()} title="Remove Link" disabled={!ed.isActive("link")}>
          <BiUnlink />
        </ToolbarButton>

        <VDivider />

        <ToolbarButton onClick={() => ed.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <BiMinus />
        </ToolbarButton>

      </div>

      {/* Search — right side, outside overflow-x-auto so dropdown is never clipped */}
      <div className="shrink-0 flex items-center px-2 border-l border-slate-100">
        <DocSearch sections={sections} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
