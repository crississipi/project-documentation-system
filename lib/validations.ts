import { z } from "zod";

// ─── Collaborator invite ───────────────────────
export const inviteCollaboratorSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]),
});

export const updateCollaboratorRoleSchema = z.object({
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]),
});

// ─── Auth ────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z
    .string()
    .length(6, "PIN must be exactly 6 characters")
    .transform((v) => v.toUpperCase()),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Projects ────────────────────────────────────
export const createProjectSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(120),
  description: z.string().max(500).optional(),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).max(10, "Maximum 10 tags"),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  docType: z.string().min(1, "Documentation type is required"),
  paperSize: z.enum(["A4", "LEGAL", "LONG"]),
});

export const updateProjectSchema = createProjectSchema.partial();

// ─── Sections ────────────────────────────────────
export const createSectionSchema = z.object({
  title: z.string().min(1, "Section title is required").max(200),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateSectionSchema = createSectionSchema.partial().extend({
  orderIndex: z.number().int().min(0).optional(),
});

// ─── Content Blocks ──────────────────────────────
export const updateContentSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().optional(),
      type: z.enum(["TEXT", "CODE", "IMAGE", "TABLE", "DIVIDER"]),
      content: z.string(),
      language: z.string().optional().nullable(),
      orderIndex: z.number().int().min(0),
    })
  ),
});
