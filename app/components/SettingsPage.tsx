"use client";

import { useEffect, useState } from "react";
import {
  BiLock, BiShield, BiSlider, BiUser, BiEnvelope,
  BiCheck, BiX, BiShow, BiHide, BiInfoCircle,
  BiMoon, BiSun, BiDesktop, BiBell,
  BiFile, BiLockOpen, BiTimeFive, BiCalendar,
  BiKey, BiCopy, BiTrash, BiPlus,
} from "react-icons/bi";
import { useAuth } from "@/app/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import { useTheme } from "@/app/context/ThemeContext";
import { useToast } from "@/app/components/ui/Toast";
import TwoFactorModal from "@/app/components/auth/TwoFactorModal";
import { DEFAULT_PREFERENCES } from "@/types";
import { formatDate } from "@/lib/utils";
import type { UserPreferences, PaperSize, ProjectVisibility, ApiKeyData } from "@/types";

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-violet-600" : "bg-slate-200"
        }`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

// ─── Pill group selector ──────────────────────────────────────────────────────

function PillGroup<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
            value === o.value
              ? "bg-violet-600 text-white border-violet-600"
              : "border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 bg-white"
          }`}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Preferences", "Security", "API Keys", "Account"] as const;
type Tab = typeof TABS[number];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const { show: showToast, ToastNode } = useToast();
  const { setTheme: applyTheme } = useTheme();

  const [activeTab, setActiveTab]   = useState<Tab>("Preferences");

  // ── Preferences state ────────────────────────────────────────────────
  const [prefs, setPrefs]           = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // ── Security / Password state ────────────────────────────────────────
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]   = useState(false);
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwError, setPwError]       = useState("");

  // ── API Keys state ───────────────────────────────────────────────────
  const [apiKeys, setApiKeys]           = useState<ApiKeyData[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showCreateKey, setShowCreateKey]   = useState(false);
  const [newKeyName, setNewKeyName]     = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["sync", "read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState<number | "">(90);
  const [creatingKey, setCreatingKey]   = useState(false);
  const [revealedKey, setRevealedKey]   = useState<string | null>(null);
  const [keyCopied, setKeyCopied]       = useState(false);

  // ── 2FA state ────────────────────────────────────────────────────────
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [disablePw, setDisablePw]   = useState("");
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [enabling2FA, setEnabling2FA] = useState(false);

  useEffect(() => { fetchPrefs(); }, []);

  // Fetch API keys when switching to that tab
  useEffect(() => {
    if (activeTab === "API Keys") fetchApiKeys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/keys");
      const json = await res.json();
      if (res.ok && json.data) setApiKeys(json.data);
    } catch { /* ignore */ }
    finally { setApiKeysLoading(false); }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) { showToast("Key name is required", "error"); return; }
    setCreatingKey(true);
    try {
      const res = await apiFetch("/api/v1/auth/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
          expiresInDays: newKeyExpiry || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setRevealedKey(json.data.rawKey);
        setApiKeys((prev) => [json.data.key, ...prev]);
        setNewKeyName("");
        setShowCreateKey(false);
        showToast("API key created", "success");
      } else {
        showToast(json.error ?? "Failed to create key", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/v1/auth/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
        showToast("API key revoked", "success");
      } else {
        const json = await res.json();
        showToast(json.error ?? "Failed to revoke key", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  // Sync theme preference to ThemeContext when prefs load
  useEffect(() => {
    if (!prefsLoading && prefs.theme) {
      applyTheme(prefs.theme as "light" | "dark" | "system");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoading]);

  const fetchPrefs = async () => {
    setPrefsLoading(true);
    try {
      const res  = await apiFetch("/api/settings");
      const json = await res.json();
      if (res.ok && json.data) {
        setPrefs(json.data);
        setPrefsDirty(false);
      }
    } catch { /* ignore */ }
    finally { setPrefsLoading(false); }
  };

  const updatePrefs = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setPrefsDirty(true);
    // Live-preview theme
    if (key === "theme") {
      applyTheme(value as "light" | "dark" | "system");
    }
  };

  const updateNotif = (key: keyof UserPreferences["emailNotifications"], value: boolean) => {
    setPrefs((p) => ({
      ...p,
      emailNotifications: { ...p.emailNotifications, [key]: value },
    }));
    setPrefsDirty(true);
  };

  const savePrefs = async () => {
    if (!prefsDirty) return;
    setPrefsSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const json = await res.json();
      if (res.ok) {
        setPrefsDirty(false);
        showToast("Preferences saved", "success");
      } else {
        showToast(json.error ?? "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setPrefsSaving(false);
    }
  };

  const changePassword = async () => {
    setPwError("");
    if (!currentPw || !newPw || !confirmPw) {
      setPwError("All fields are required"); return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match"); return;
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters"); return;
    }
    setPwSaving(true);
    try {
      const res = await apiFetch("/api/profile/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (res.ok) {
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
        showToast("Password changed successfully", "success");
      } else {
        setPwError(json.error ?? "Failed to change password");
      }
    } catch {
      setPwError("Network error");
    } finally {
      setPwSaving(false);
    }
  };

  const passwordStrength = (pw: string) => {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak",   color: "bg-red-500",    width: "w-1/5" };
    if (score <= 2) return { label: "Fair",   color: "bg-amber-500",  width: "w-2/5" };
    if (score <= 3) return { label: "Good",   color: "bg-yellow-500", width: "w-3/5" };
    if (score <= 4) return { label: "Strong", color: "bg-emerald-500", width: "w-4/5" };
    return                 { label: "Very strong", color: "bg-emerald-600", width: "w-full" };
  };

  const strength = passwordStrength(newPw);

  // ── 2FA handlers ──────────────────────────────────────────────────────

  const startEnable2FA = async () => {
    setEnabling2FA(true);
    try {
      const res = await apiFetch("/api/auth/2fa/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setShow2FAModal(true);
      } else {
        showToast(json.error ?? "Failed to send OTP", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePw) { showToast("Enter your password to confirm", "error"); return; }
    setDisabling2FA(true);
    try {
      const res = await apiFetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: disablePw }),
      });
      const json = await res.json();
      if (res.ok) {
        setShow2FADisableModal(false);
        setDisablePw("");
        showToast("Two-factor authentication disabled", "success");
        await refresh();
      } else {
        showToast(json.error ?? "Failed to disable 2FA", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDisabling2FA(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col bg-zinc-100 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 sm:px-8 sm:pt-7 bg-zinc-100 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your preferences and account security</p>
          </div>
          {/* Save button only relevant on Preferences tab */}
          {activeTab === "Preferences" && (
            <button type="button" disabled={!prefsDirty || prefsSaving} onClick={savePrefs}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                prefsDirty && !prefsSaving
                  ? "bg-violet-600 hover:bg-violet-700 text-white shadow"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}>
              {prefsSaving ? (
                <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <BiCheck className="text-base" />
              )}
              {prefsSaving ? "Saving…" : prefsDirty ? "Save preferences" : "Saved"}
            </button>
          )}
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 mt-5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {tab === "Preferences" && <BiSlider className="text-base" />}
              {tab === "Security"    && <BiLock className="text-base" />}
              {tab === "API Keys"    && <BiKey className="text-base" />}
              {tab === "Account"     && <BiUser className="text-base" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 space-y-5">

        {/* ──────────────────── PREFERENCES ──────────────────────────── */}
        {activeTab === "Preferences" && (
          <>
            {prefsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Appearance */}
                <SectionCard title="Appearance" description="Choose how the interface looks">
                  <div className="mb-1">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1.5">
                      <BiDesktop className="text-slate-400" /> Theme
                    </p>
                    <PillGroup
                      value={prefs.theme}
                      onChange={(v) => updatePrefs("theme", v)}
                      options={[
                        { value: "light",  label: "Light",  icon: <BiSun /> },
                        { value: "dark",   label: "Dark",   icon: <BiMoon /> },
                        { value: "system", label: "System", icon: <BiDesktop /> },
                      ]}
                    />
                  </div>
                </SectionCard>

                {/* Email Notifications */}
                <SectionCard title="Email Notifications" description="Control which emails you receive">
                  <div className="flex items-start gap-2 mb-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <BiBell className="text-base shrink-0 mt-0.5" />
                    <span>Notification emails will be sent to <strong>{user?.email}</strong></span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <Toggle checked={prefs.emailNotifications.documentUpdated}
                      onChange={(v) => updateNotif("documentUpdated", v)}
                      label="Document updated" description="When a collaborator edits your document" />
                    <Toggle checked={prefs.emailNotifications.inviteReceived}
                      onChange={(v) => updateNotif("inviteReceived", v)}
                      label="Collaboration invite" description="When someone invites you to collaborate" />
                    <Toggle checked={prefs.emailNotifications.weeklyDigest}
                      onChange={(v) => updateNotif("weeklyDigest", v)}
                      label="Weekly activity digest" description="A summary of your project activity each week" />
                  </div>
                </SectionCard>

                {/* Document Defaults */}
                <SectionCard title="Document Defaults" description="Default values when creating new projects">
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                        <BiFile className="text-slate-400" /> Default paper size
                      </p>
                      <PillGroup
                        value={prefs.defaultPaperSize}
                        onChange={(v) => updatePrefs("defaultPaperSize", v as PaperSize)}
                        options={[
                          { value: "A4",    label: "A4" },
                          { value: "LEGAL", label: "Legal" },
                          { value: "LONG",  label: "Long" },
                        ]}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                        <BiLockOpen className="text-slate-400" /> Default visibility
                      </p>
                      <PillGroup
                        value={prefs.defaultVisibility}
                        onChange={(v) => updatePrefs("defaultVisibility", v as ProjectVisibility)}
                        options={[
                          { value: "PRIVATE", label: "Private" },
                          { value: "PUBLIC",  label: "Public" },
                        ]}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                        <BiTimeFive className="text-slate-400" /> Auto-save inactivity timer
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={5} max={120} step={5}
                          value={prefs.autoSaveInterval}
                          onChange={(e) => updatePrefs("autoSaveInterval", Number(e.target.value))}
                          className="flex-1 accent-violet-600"
                        />
                        <span className="text-sm font-semibold text-violet-700 w-16 text-right">
                          {prefs.autoSaveInterval}s
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Document auto-saves after {prefs.autoSaveInterval} seconds of inactivity
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </>
            )}
          </>
        )}

        {/* ──────────────────── SECURITY ─────────────────────────────── */}
        {activeTab === "Security" && (
          <>
            <SectionCard title="Change Password" description="Update your account password">
              <div className="space-y-4">
                {/* Current password */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BiLock className="text-slate-400" /> Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Enter current password"
                      className="w-full px-3.5 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 bg-white"
                    />
                    <button type="button" onClick={() => setShowCurrentPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurrentPw ? <BiHide /> : <BiShow />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BiShield className="text-slate-400" /> New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="w-full px-3.5 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 bg-white"
                    />
                    <button type="button" onClick={() => setShowNewPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNewPw ? <BiHide /> : <BiShow />}
                    </button>
                  </div>
                  {/* Strength meter */}
                  {newPw && strength && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${
                        strength.label === "Weak" ? "text-red-500" :
                        strength.label === "Fair" ? "text-amber-500" :
                        strength.label === "Good" ? "text-yellow-600" : "text-emerald-600"
                      }`}>{strength.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BiCheck className="text-slate-400" /> Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 bg-white"
                  />
                  {confirmPw && newPw && (
                    <p className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                      newPw === confirmPw ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {newPw === confirmPw ? <BiCheck /> : <BiX />}
                      {newPw === confirmPw ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {pwError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <BiX className="shrink-0" /> {pwError}
                  </p>
                )}

                <button type="button" onClick={changePassword} disabled={pwSaving}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {pwSaving
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Changing…</>
                    : <><BiLock /> Change Password</>}
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Login Security" description="Additional security information">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <BiEnvelope className="text-slate-400 text-base" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Email verification</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  {user?.isEmailVerified ? (
                    <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">Verified</span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">Not verified</span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <BiShield className="text-slate-400 text-base" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Two-factor authentication</p>
                      <p className="text-xs text-slate-500">Add an extra layer of security via email OTP</p>
                    </div>
                  </div>
                  {user?.twoFactorEnabled ? (
                    <button
                      type="button"
                      onClick={() => setShow2FADisableModal(true)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Disable 2FA
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startEnable2FA}
                      disabled={enabling2FA}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
                    >
                      {enabling2FA ? "Sending…" : "Enable 2FA"}
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ──────────────────── API KEYS ──────────────────────────────── */}
        {activeTab === "API Keys" && (
          <>
            {/* Revealed key banner */}
            {revealedKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <BiInfoCircle className="text-amber-600 text-xl shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">Your new API key — copy it now!</p>
                    <p className="text-xs text-amber-600 mt-0.5">This key will only be shown once. Store it securely.</p>
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono text-slate-800 break-all select-all">
                        {revealedKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyKey(revealedKey)}
                        className="shrink-0 p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                        title="Copy to clipboard"
                      >
                        {keyCopied ? <BiCheck /> : <BiCopy />}
                      </button>
                    </div>
                    <button
                      onClick={() => setRevealedKey(null)}
                      className="mt-3 text-xs text-amber-700 underline hover:text-amber-900"
                    >
                      Dismiss — I&apos;ve saved the key
                    </button>
                  </div>
                </div>
              </div>
            )}

            <SectionCard title="API Keys" description="Manage keys for CLI tools and automation">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    {apiKeys.length === 0 ? "No active API keys" : `${apiKeys.length} active key${apiKeys.length === 1 ? "" : "s"}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateKey(!showCreateKey)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    <BiPlus /> Create Key
                  </button>
                </div>

                {/* Create key form */}
                {showCreateKey && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Key Name</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. CI Pipeline, Local Dev"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Scopes</label>
                      <div className="flex gap-2 flex-wrap">
                        {["sync", "read", "*"].map((scope) => (
                          <button
                            key={scope}
                            type="button"
                            onClick={() => {
                              setNewKeyScopes((prev) =>
                                prev.includes(scope)
                                  ? prev.filter((s) => s !== scope)
                                  : [...prev, scope]
                              );
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                              newKeyScopes.includes(scope)
                                ? "bg-violet-600 text-white border-violet-600"
                                : "border-slate-200 text-slate-600 hover:border-violet-300 bg-white"
                            }`}
                          >
                            {scope === "*" ? "All" : scope}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Expires In (days)</label>
                      <input
                        type="number"
                        value={newKeyExpiry}
                        onChange={(e) => setNewKeyExpiry(e.target.value ? parseInt(e.target.value) : "")}
                        placeholder="Leave empty for no expiry"
                        className="w-48 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 bg-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCreateKey(false)}
                        className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={createApiKey}
                        disabled={creatingKey || !newKeyName.trim()}
                        className="px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {creatingKey ? (
                          <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
                        ) : (
                          <><BiKey /> Generate Key</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Key list */}
                {apiKeysLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <BiKey className="text-slate-400 text-lg shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{key.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                                ontap_{key.prefix}...
                              </code>
                              <span>·</span>
                              <span>{key.scopes.join(", ")}</span>
                              {key.lastUsedAt && (
                                <>
                                  <span>·</span>
                                  <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                                </>
                              )}
                              {key.expiresAt && (
                                <>
                                  <span>·</span>
                                  <span className={new Date(key.expiresAt) < new Date() ? "text-red-500 font-semibold" : ""}>
                                    {new Date(key.expiresAt) < new Date() ? "Expired" : `Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => revokeApiKey(key.id)}
                          className="shrink-0 p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Revoke key"
                        >
                          <BiTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Usage Guide" description="How to use API keys for documentation automation">
              <div className="space-y-3 text-sm text-slate-600">
                <p>Use your API key to sync documentation from your codebase via the CLI or CI/CD pipeline.</p>
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto">
                  <p className="text-slate-400"># Sync files to a project</p>
                  <p>curl -X POST \</p>
                  <p className="pl-4">{typeof window !== "undefined" ? window.location.origin : "https://your-api.vercel.app"}/api/v1/projects/PROJECT_ID/sync \</p>
                  <p className="pl-4">-H &quot;Authorization: Bearer ontap_YOUR_KEY&quot; \</p>
                  <p className="pl-4">-H &quot;Content-Type: application/json&quot; \</p>
                  <p className="pl-4">-d &apos;{`{"files":[{"filePath":"src/index.ts","content":"..."}]}`}&apos;</p>
                </div>
                <p className="text-xs text-slate-400">
                  <strong>Scopes:</strong> <code className="bg-slate-100 px-1 rounded">sync</code> — push file content,{" "}
                  <code className="bg-slate-100 px-1 rounded">read</code> — read project data,{" "}
                  <code className="bg-slate-100 px-1 rounded">*</code> — all permissions.
                </p>
              </div>
            </SectionCard>
          </>
        )}

        {/* ──────────────────── ACCOUNT ──────────────────────────────── */}
        {activeTab === "Account" && (
          <>
            <SectionCard title="Account Information" description="Your account details">
              <div className="space-y-0 divide-y divide-slate-100">
                {[
                  { icon: <BiUser />,     label: "Full Name",    value: user?.name ?? "—" },
                  { icon: <BiEnvelope />, label: "Email",        value: user?.email ?? "—" },
                  { icon: <BiShield />,   label: "Role",         value: user?.role ?? "USER" },
                  {
                    icon: <BiCalendar />,
                    label: "Member Since",
                    value: user?.createdAt ? formatDate(user.createdAt) : "—",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-4 py-3.5">
                    <span className="text-slate-400 text-base">{row.icon}</span>
                    <span className="text-sm text-slate-500 w-28 shrink-0">{row.label}</span>
                    <span className="text-sm font-semibold text-slate-800">{row.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Email Verification Status" description="Your email address verification">
              <div className={`flex items-start gap-3 p-4 rounded-xl ${
                user?.isEmailVerified
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-amber-50 border border-amber-200"
              }`}>
                {user?.isEmailVerified
                  ? <BiShield className="text-emerald-600 text-xl shrink-0 mt-0.5" />
                  : <BiInfoCircle className="text-amber-600 text-xl shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-semibold ${user?.isEmailVerified ? "text-emerald-700" : "text-amber-700"}`}>
                    {user?.isEmailVerified ? "Your email is verified" : "Your email is not verified"}
                  </p>
                  <p className={`text-xs mt-0.5 ${user?.isEmailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                    {user?.isEmailVerified
                      ? "Your account is fully secured and functional."
                      : "Please check your inbox for a verification link."}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Danger Zone" description="Irreversible actions — proceed with care">
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Delete account</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <button type="button" disabled
                  className="px-4 py-2 text-xs font-semibold text-red-400 border border-red-200 rounded-xl bg-red-50 cursor-not-allowed">
                  Delete Account
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <BiInfoCircle /> Account deletion requires contacting support and is currently disabled in this build.
              </p>
            </SectionCard>
          </>
        )}
      </div>

      {ToastNode}

      {/* ── Enable 2FA modal (OTP verification) ──────────────────── */}
      {show2FAModal && (
        <TwoFactorModal
          enable
          onVerified={async () => {
            setShow2FAModal(false);
            showToast("Two-factor authentication enabled successfully", "success");
            await refresh();
          }}
          onClose={() => setShow2FAModal(false)}
        />
      )}

      {/* ── Disable 2FA confirm modal ─────────────────────────────── */}
      {show2FADisableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Disable 2FA</h3>
            <p className="text-sm text-slate-500 mb-4">
              Enter your current password to confirm disabling two-factor authentication.
            </p>
            <input
              type="password"
              value={disablePw}
              onChange={(e) => setDisablePw(e.target.value)}
              placeholder="Current password"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 bg-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShow2FADisableModal(false); setDisablePw(""); }}
                className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={disabling2FA}
                className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {disabling2FA ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Disabling…</>
                ) : "Disable 2FA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
