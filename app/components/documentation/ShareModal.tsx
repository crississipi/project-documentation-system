"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BiLink, BiMailSend, BiTrash, BiX, BiCheck, BiUserPlus,
  BiGlobe, BiLock, BiToggleLeft, BiToggleRight, BiCopy,
  BiRefresh, BiShield,
} from "react-icons/bi";
import type { CollaboratorRole, ProjectCollaboratorData } from "@/types";
import { apiFetch } from "@/lib/apiFetch";

interface ShareModalProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}

interface SharedLinkData {
  token: string;
  canEdit: boolean;
  canComment: boolean;
  canDownload: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  VIEWER: "View only",
  COMMENTER: "Can comment",
  EDITOR: "Can edit",
};

// ── Small toggle row ──────────────────────────────────────────────────────────
function PermToggle({
  label, description, checked, onChange, disabled,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full py-2 disabled:opacity-50"
    >
      <div className="text-left">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      {checked ? (
        <BiToggleRight className="text-2xl text-violet-600 shrink-0" />
      ) : (
        <BiToggleLeft className="text-2xl text-slate-400 shrink-0" />
      )}
    </button>
  );
}

export function ShareModal({ projectId, projectTitle, onClose }: ShareModalProps) {
  const [collaborators, setCollaborators] = useState<ProjectCollaboratorData[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("VIEWER");
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharedLinkCopied, setSharedLinkCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Shared link state
  const [sharedLink, setSharedLink] = useState<SharedLinkData | null | undefined>(undefined); // undefined = not loaded
  const [linkLoading, setLinkLoading] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkPerms, setLinkPerms] = useState({ canEdit: false, canComment: false, canDownload: false });

  const loadCollaborators = useCallback(async () => {
    const res = await apiFetch(`/api/projects/${projectId}/collaborators`);
    const json = await res.json();
    if (res.ok) setCollaborators(json.data ?? []);
  }, [projectId]);

  const loadSharedLink = useCallback(async () => {
    setLinkLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/share`);
      const json = await res.json();
      if (res.ok) {
        setSharedLink(json.data ?? null);
        if (json.data) {
          setLinkPerms({
            canEdit: json.data.canEdit,
            canComment: json.data.canComment,
            canDownload: json.data.canDownload,
          });
        }
      }
    } catch { /* ignore */ } finally { setLinkLoading(false); }
  }, [projectId]);

  useEffect(() => {
    loadCollaborators();
    loadSharedLink();
  }, [loadCollaborators, loadSharedLink]);

  const generateLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(linkPerms),
      });
      const json = await res.json();
      if (res.ok) setSharedLink(json.data);
    } catch { /* ignore */ } finally { setGeneratingLink(false); }
  };

  const updateLinkPerms = async (newPerms: typeof linkPerms) => {
    setLinkPerms(newPerms);
    if (!sharedLink) return; // will be applied when generating
    try {
      const res = await apiFetch(`/api/projects/${projectId}/share`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newPerms),
      });
      const json = await res.json();
      if (res.ok) setSharedLink(json.data);
    } catch { /* ignore */ }
  };

  const revokeLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/share`, { method: "DELETE" });
      if (res.ok) {
        setSharedLink(null);
        setLinkPerms({ canEdit: false, canComment: false, canDownload: false });
      }
    } catch { /* ignore */ } finally { setGeneratingLink(false); }
  };

  const copySharedLink = async () => {
    if (!sharedLink) return;
    await navigator.clipboard.writeText(`${window.location.origin}/shared/${sharedLink.token}`);
    setSharedLinkCopied(true);
    setTimeout(() => setSharedLinkCopied(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/projects/${projectId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setInviting(true);
    const res = await apiFetch(`/api/projects/${projectId}/collaborators`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const json = await res.json();
    setInviting(false);
    if (res.ok) {
      setEmail("");
      setSuccess(`Invite sent to ${email}`);
      loadCollaborators();
    } else {
      setError(json.error ?? "Failed to send invite.");
    }
  };

  const removeCollaborator = async (colId: string) => {
    const res = await apiFetch(`/api/projects/${projectId}/collaborators/${colId}`, { method: "DELETE" });
    if (res.ok) setCollaborators((prev) => prev.filter((c) => c.id !== colId));
  };

  const changeRole = async (colId: string, newRole: CollaboratorRole) => {
    const res = await apiFetch(`/api/projects/${projectId}/collaborators/${colId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setCollaborators((prev) => prev.map((c) => (c.id === colId ? { ...c, role: newRole } : c)));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BiUserPlus className="text-violet-500 text-xl" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Share &ldquo;{projectTitle}&rdquo;</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage access and generate shareable links</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <BiX className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* ── Shared public link ───────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <BiGlobe className="text-violet-500 shrink-0" />
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Public shared link</p>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              {/* Permissions (always visible; applied when link is generated) */}
              <div className="divide-y divide-slate-100">
                <PermToggle
                  label="Allow download"
                  description="Anyone with the link can export the PDF"
                  checked={linkPerms.canDownload}
                  onChange={(v) => updateLinkPerms({ ...linkPerms, canDownload: v })}
                />
                <PermToggle
                  label="Allow commenting"
                  description="Signed-in users with the link can add comments"
                  checked={linkPerms.canComment}
                  onChange={(v) => updateLinkPerms({ ...linkPerms, canComment: v })}
                />
                <PermToggle
                  label="Allow editing"
                  description="Signed-in users with the link can edit content"
                  checked={linkPerms.canEdit}
                  onChange={(v) => updateLinkPerms({ ...linkPerms, canEdit: v })}
                />
              </div>

              {/* Link URL row */}
              {sharedLink ? (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <BiLink className="text-slate-400 shrink-0" />
                  <span className="flex-1 text-xs text-slate-500 truncate font-mono min-w-0">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/shared/${sharedLink.token}`
                      : ""}
                  </span>
                  <button
                    type="button"
                    onClick={copySharedLink}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sharedLinkCopied ? "bg-green-100 text-green-700" : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {sharedLinkCopied ? <><BiCheck /> Copied!</> : <><BiCopy /> Copy</>}
                  </button>
                  <button
                    type="button"
                    onClick={generateLink}
                    title="Regenerate link (old link becomes invalid)"
                    disabled={generatingLink}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <BiRefresh className={generatingLink ? "animate-spin" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={revokeLink}
                    title="Revoke shared link"
                    disabled={generatingLink}
                    className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <BiLock />
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200">
                  {linkLoading || sharedLink === undefined ? (
                    <div className="h-8 bg-slate-200 rounded-lg animate-pulse" />
                  ) : (
                    <button
                      type="button"
                      onClick={generateLink}
                      disabled={generatingLink}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      <BiGlobe />
                      {generatingLink ? "Generating…" : "Generate shared link"}
                    </button>
                  )}
                  <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
                    <BiShield className="text-xs" />
                    Anyone with the link can view this document
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Internal project link (for existing collaborators) ─────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Collaborator link</p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <BiLink className="text-slate-400 shrink-0 text-lg" />
              <span className="flex-1 text-xs text-slate-500 truncate font-mono">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/projects/${projectId}`
                  : ""}
              </span>
              <button
                type="button"
                onClick={copyLink}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  copied ? "bg-green-100 text-green-700" : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                {copied ? <><BiCheck />Copied!</> : "Copy link"}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Only invited collaborators who are signed in can use this link.</p>
          </div>

          {/* ── Invite by email ──────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invite by email</p>
            <form onSubmit={invite} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 min-w-0"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                  className="text-sm border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-violet-400 bg-white shrink-0"
                >
                  <option value="VIEWER">View only</option>
                  <option value="COMMENTER">Can comment</option>
                  <option value="EDITOR">Can edit</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                <BiMailSend className="text-base" />
                {inviting ? "Sending invite…" : "Send invite"}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
              {success && <p className="text-xs text-green-600">{success}</p>}
            </form>
          </div>

          {/* ── Collaborators list ────────────────────────────────────────────── */}
          {collaborators.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                People with access ({collaborators.length})
              </p>
              <div className="space-y-1.5">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0 uppercase">
                      {(c.invitedName ?? c.invitedEmail)[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      {c.invitedName && (
                        <p className="text-xs font-medium text-slate-900 truncate leading-none mb-0.5">
                          {c.invitedName}
                          {c.hasEdited && <span className="ml-1.5 text-[10px] text-violet-600 font-normal">(co-author)</span>}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 truncate">{c.invitedEmail}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      c.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                    }`}>
                      {c.status === "PENDING" ? "Pending" : "Active"}
                    </span>
                    <select
                      value={c.role}
                      onChange={(e) => changeRole(c.id, e.target.value as CollaboratorRole)}
                      className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-violet-400 bg-white shrink-0"
                    >
                      <option value="VIEWER">View</option>
                      <option value="COMMENTER">Comment</option>
                      <option value="EDITOR">Edit</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeCollaborator(c.id)}
                      className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors shrink-0"
                    >
                      <BiTrash className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Role legend ───────────────────────────────────────────────────── */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Permission levels</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ROLE_LABELS) as [CollaboratorRole, string][]).map(([k, v]) => (
                <div key={k} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-xs font-medium text-slate-700">{v}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {k === "VIEWER" && "Read & copy"}
                    {k === "COMMENTER" && "Suggest changes"}
                    {k === "EDITOR" && "Add, edit, delete"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}