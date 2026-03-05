"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProjectSchema } from "@/lib/validations";
import { Modal } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/app/components/ui/Button";
import type { ProjectSummary } from "@/types";

const DOC_FLOWS = [
  { value: "CATEGORY", label: "📂 Category (Setup → Frontend → Backend → Testing → Other)" },
  { value: "CONNECTION", label: "🔗 Connection (Frontend → Backend API → Supporting Files)" },
  { value: "MODULE", label: "📦 Module (Grouped by Module / Feature)" },
  { value: "ALPHABETICAL", label: "🔤 Alphabetical" },
  { value: "CUSTOM", label: "✏️ Custom (Manual Order)" },
];

const formSchema = createProjectSchema.omit({ tags: true, docFlow: true }).extend({
  tagsArray: z.array(z.string()),
  docFlow: z.enum(["CATEGORY", "CONNECTION", "MODULE", "ALPHABETICAL", "CUSTOM"]),
});
type FormValues = z.infer<typeof formSchema>;

const CATEGORIES = [
  "Web Application", "Mobile Application", "API / Backend", "E-Commerce",
  "SaaS Platform", "Desktop Application", "Game", "DevOps / Infrastructure",
  "Data Science / ML", "Other",
];

const DOC_TYPES = [
  "Technical Documentation", "API Reference", "User Guide",
  "Architecture Overview", "Product Specification", "Runbook", "Other",
];

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectSummary) => void;
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [serverError, setServerError] = useState("");
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      visibility: "PRIVATE",
      paperSize: "A4",
      docType: "Technical Documentation",
      category: "Web Application",
      tagsArray: [],
      docFlow: "CATEGORY",
    },
  });

  const tagsArray = watch("tagsArray") ?? [];

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tagsArray.includes(t) && tagsArray.length < 10) {
      setValue("tagsArray", [...tagsArray, t]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setValue("tagsArray", tagsArray.filter((t) => t !== tag));
  };

  const onSubmit = async (data: FormValues) => {
    setServerError("");
    const res = await apiFetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tagsArray,
        visibility: data.visibility,
        docType: data.docType,
        paperSize: data.paperSize,
        docFlow: data.docFlow,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Failed to create project"); return; }
    reset();
    setTagInput("");
    onCreated(json.data);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Project" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Project Title" error={errors.title?.message} {...register("title")} />
        <Input label="Short Description (optional)" error={errors.description?.message} {...register("description")} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            error={errors.category?.message}
            {...register("category")}
          />
          <Select
            label="Documentation Type"
            options={DOC_TYPES.map((d) => ({ value: d, label: d }))}
            error={errors.docType?.message}
            {...register("docType")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Visibility"
            options={[{ value: "PRIVATE", label: "🔒 Private" }, { value: "PUBLIC", label: "🌐 Public" }]}
            {...register("visibility")}
          />
          <Select
            label="Default Paper Size"
            options={[
              { value: "A4", label: "A4 (210 × 297 mm)" },
              { value: "LEGAL", label: "Legal (216 × 356 mm)" },
              { value: "LONG", label: "Long (216 × 330 mm)" },
            ]}
            {...register("paperSize")}
          />
        </div>

        <Select
          label="Documentation Flow"
          options={DOC_FLOWS.map((f) => ({ value: f.value, label: f.label }))}
          error={errors.docFlow?.message}
          {...register("docFlow")}
        />

        {/* Tags */}
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Add a tag and press Enter…"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-600"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addTag}>Add</Button>
          </div>
          {tagsArray.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tagsArray.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-3 py-1 rounded-full"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="flex gap-3 justify-end mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create Project</Button>
        </div>
      </form>
    </Modal>
  );
}
