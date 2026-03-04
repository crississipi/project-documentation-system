"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

const lowlight = createLowlight(common);

interface DocumentEditorProps {
  sectionId: string;
  projectId: string;
  initialContent: string;
  onSave: (sectionId: string, content: string) => void;
  /** Called when this editor gains focus so the parent can wire the shared toolbar */
  onEditorReady?: (editor: Editor) => void;
}

export function DocumentEditor({
  sectionId,
  projectId,
  initialContent,
  onSave,
  onEditorReady,
}: DocumentEditorProps) {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "javascript",
        HTMLAttributes: { class: "code-block" },
      }),
      Placeholder.configure({
        placeholder: "Start writing your documentation here…",
      }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "doc-content focus:outline-none min-h-full",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      // Notify parent immediately; parent owns the debounce/auto-save timer
      onSave(sectionId, editor.getHTML());
    },
    onFocus: () => {
      if (editor && onEditorReady) onEditorReady(editor);
    },
    immediatelyRender: false,
  });

  // Register editor on mount so toolbar works immediately
  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Update content when switching sections
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, initialContent]);



  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" key={sectionId} />
      </div>
    </div>
  );
}
