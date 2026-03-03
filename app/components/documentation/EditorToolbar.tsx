"use client";

import type { Editor } from "@tiptap/react";
import {
  BiBold, BiItalic, BiUnderline, BiStrikethrough,
  BiCode, BiCodeBlock, BiLink, BiUnlink,
  BiAlignLeft, BiAlignMiddle, BiAlignRight, BiAlignJustify,
  BiListOl, BiListUl, BiMinus, BiHighlight, BiUndo, BiRedo,
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
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-slate-200 bg-white flex-wrap sticky top-0 z-10">
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
        <BiUndo />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
        <BiRedo />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      {([1, 2, 3] as const).map((level) => (
        <button
          key={level}
          type="button"
          title={`Heading ${level}`}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level }).run(); }}
          className={cn(
            "px-2 h-7 text-xs font-bold rounded transition-colors",
            editor.isActive("heading", { level })
              ? "bg-violet-100 text-violet-700"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          H{level}
        </button>
      ))}

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
