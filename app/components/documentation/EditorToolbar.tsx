"use client";

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import {
  BiBold, BiItalic, BiUnderline, BiStrikethrough,
  BiCode, BiCodeBlock, BiLink, BiUnlink,
  BiAlignLeft, BiAlignMiddle, BiAlignRight, BiAlignJustify,
  BiListOl, BiListUl, BiMinus, BiHighlight, BiUndo, BiRedo,
  BiChevronDown, BiSolidQuoteAltLeft,
} from "react-icons/bi";
import { cn } from "@/lib/cn";

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
        "w-7 h-7 flex items-center justify-center rounded text-sm transition-colors",
        active ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-1" />;
}

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  // Close heading dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setHeadingOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeHeading = ([1, 2, 3, 4, 5, 6] as const).find(
    (level) => editor.isActive("heading", { level })
  );

  const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (!url) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      data-pdf-hide="true"
      className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-200 bg-white flex-wrap sticky top-0 z-10"
    >
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
        <BiUndo />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
        <BiRedo />
      </ToolbarButton>

      <Divider />

      {/* Heading dropdown */}
      <div className="relative" ref={headingRef}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setHeadingOpen(!headingOpen); }}
          className={cn(
            "flex items-center gap-1 px-2 h-7 text-xs font-semibold rounded transition-colors",
            activeHeading
              ? "bg-violet-100 text-violet-700"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          {activeHeading ? `H${activeHeading}` : "Normal"}
          <BiChevronDown className="w-3 h-3" />
        </button>
        {headingOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setParagraph().run();
                setHeadingOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors",
                !activeHeading ? "bg-violet-50 text-violet-700" : "text-slate-600"
              )}
            >
              Normal text
            </button>
            {([1, 2, 3, 4, 5, 6] as const).map((level) => (
              <button
                key={level}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleHeading({ level }).run();
                  setHeadingOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors",
                  editor.isActive("heading", { level })
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600",
                  level === 1 && "text-lg font-bold",
                  level === 2 && "text-base font-bold",
                  level === 3 && "text-sm font-semibold",
                  level === 4 && "text-sm font-semibold",
                  level === 5 && "text-xs font-semibold",
                  level === 6 && "text-xs font-semibold uppercase tracking-wide",
                )}
              >
                Heading {level}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Text formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
        <BiBold />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
        <BiItalic />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
        <BiUnderline />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
        <BiStrikethrough />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
        <BiHighlight />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
        <BiAlignLeft />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
        <BiAlignMiddle />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
        <BiAlignRight />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify">
        <BiAlignJustify />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
        <BiListUl />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
        <BiListOl />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
        <BiSolidQuoteAltLeft />
      </ToolbarButton>

      <Divider />

      {/* Code */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
        <BiCode />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
        <BiCodeBlock />
      </ToolbarButton>

      <Divider />

      {/* Link */}
      <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Add Link">
        <BiLink />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link" disabled={!editor.isActive("link")}>
        <BiUnlink />
      </ToolbarButton>

      <Divider />

      {/* Horizontal Rule */}
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <BiMinus />
      </ToolbarButton>
    </div>
  );
}
