// Shared TypeScript types across the application

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type ProjectVisibility = "PRIVATE" | "PUBLIC";
export type PaperSize = "A4" | "LEGAL" | "LONG";
export type BlockType = "TEXT" | "CODE" | "IMAGE" | "TABLE" | "DIVIDER";
export type CollaboratorRole = "VIEWER" | "COMMENTER" | "EDITOR";
export type CollaboratorStatus = "PENDING" | "ACCEPTED";

// ─── Auth ────────────────────────────────────────
export interface JWTPayload {
  sub: string;       // user id
  email: string;
  name: string;
  role: UserRole;
  twoFactorEnabled?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  emailNotifications: {
    documentUpdated: boolean;
    inviteReceived: boolean;
    weeklyDigest: boolean;
  };
  defaultPaperSize: PaperSize;
  defaultVisibility: ProjectVisibility;
  autoSaveInterval: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  emailNotifications: {
    documentUpdated: true,
    inviteReceived: true,
    weeklyDigest: false,
  },
  defaultPaperSize: "A4",
  defaultVisibility: "PRIVATE",
  autoSaveInterval: 20,
};

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  bio: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  website: string | null;
  location: string | null;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

// ─── API Responses ───────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ─── Projects ────────────────────────────────────
export interface ProjectSummary {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  visibility: ProjectVisibility;
  docType: string;
  paperSize: PaperSize;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  versionNumber: number;
  sectionCount: number;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  category: string;
  tags: string[];
  visibility: ProjectVisibility;
  docType: string;
  paperSize: PaperSize;
}

// ─── Sections ────────────────────────────────────
export interface SectionWithBlocks {
  id: string;
  projectId: string;
  title: string;
  orderIndex: number;
  blocks: ContentBlockData[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlockData {
  id: string;
  sectionId: string;
  type: BlockType;
  content: string;
  language?: string | null;
  orderIndex: number;
}

// ─── Documentation ───────────────────────────────
export interface CoAuthor {
  name: string;
  email: string;
}

export interface ProjectCollaboratorData {
  id: string;
  projectId: string;
  invitedEmail: string;
  invitedName: string | null;
  userId: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  hasEdited: boolean;
  createdAt: string;
}

export interface DocumentationPageData {
  project: ProjectSummary;
  sections: SectionWithBlocks[];
  collaborators: ProjectCollaboratorData[];
  coAuthors: CoAuthor[];
}

// ─── Forms ───────────────────────────────────────
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface NewProjectFormData {
  title: string;
  description: string;
  category: string;
  tags: string;
  visibility: ProjectVisibility;
  docType: string;
  paperSize: PaperSize;
}

// ─── API Keys ────────────────────────────────────
export type SyncStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ApiKeyData {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  key: ApiKeyData;
  rawKey: string; // only returned once at creation time
}

// ─── Documentation Sync ──────────────────────────
export interface SyncFilePayload {
  filePath: string;
  content: string;       // raw file content
  language?: string;
  fileHash?: string;     // SHA-256 of file content, computed client-side
  symbols?: SyncSymbolPayload[];
}

export interface SyncSymbolPayload {
  name: string;
  kind: string;         // "function" | "class" | "method" | "interface" etc.
  startLine: number;
  endLine: number;
  signature?: string;
  docstring?: string;
}

export interface SyncPayload {
  files: SyncFilePayload[];
  commitHash?: string;
  branch?: string;
}

export interface SyncResult {
  snapshotId: string;
  filesProcessed: number;
  sectionsCreated: number;
  sectionsUpdated: number;
  status: SyncStatus;
}
