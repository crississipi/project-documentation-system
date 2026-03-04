"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BiBarChart, BiGroup, BiShield, BiSearch, BiChevronLeft,
  BiChevronRight, BiRefresh, BiUserCheck, BiCheckCircle,
  BiLockOpen, BiFolder, BiGlobe, BiX, BiUser, BiLock,
  BiBlock, BiKey, BiChevronDown, BiInfoCircle,
} from "react-icons/bi";
import { useToast } from "@/app/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types";
import { apiFetch } from "@/lib/apiFetch";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number; verifiedUsers: number; unverifiedUsers: number;
  disabledUsers: number; totalProjects: number; publicProjects: number; activeSessions: number;
}

interface AdminUser {
  id: string; email: string; name: string; role: UserRole;
  isEmailVerified: boolean; isDisabled: boolean; twoFactorEnabled: boolean;
  createdAt: string; _count: { projects: number };
}

interface AdminUserDetail {
  id: string; email: string; name: string; role: UserRole;
  isEmailVerified: boolean; isDisabled: boolean; disabledAt: string | null;
  twoFactorEnabled: boolean; avatarUrl: string | null; bio: string | null;
  phone: string | null; jobTitle: string | null; company: string | null;
  website: string | null; location: string | null;
  failedLoginAttempts: number; lockedUntil: string | null;
  createdAt: string; updatedAt: string;
  _count: { projects: number; sessions: number; apiKeys: number };
}

interface UserDetailData {
  user: AdminUserDetail;
  projects: { id: string; title: string; category: string; createdAt: string; updatedAt: string; _count: { sections: number } }[];
  sessions: { id: string; createdAt: string; expiresAt: string }[];
  activitySeries: { date: string; count: number }[];
}

interface ActivityData {
  days: string[];
  signups: { date: string; count: number }[];
  logins: { date: string; count: number }[];
  projects: { date: string; count: number }[];
  edits: { date: string; count: number }[];
}

interface Pagination { total: number; page: number; limit: number; totalPages: number; }

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, loading, onClick }: {
  label: string; value: number | string; icon: React.ReactNode; color: string;
  loading?: boolean; onClick?: () => void;
}) {
  const isClickable = !!onClick;
  return (
    <button type="button" onClick={onClick} disabled={!isClickable}
      className={`bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm text-left w-full transition-all ${
        isClickable ? "hover:border-violet-300 hover:shadow-md cursor-pointer" : "cursor-default"}`}>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white text-xl shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        {loading ? <div className="h-6 w-16 bg-slate-200 rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold text-slate-900">{value}</p>}
        {isClickable && !loading && <p className="text-[10px] text-violet-500 font-medium mt-0.5">Click to filter →</p>}
      </div>
    </button>
  );
}

// ── Role badge ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    USER: "bg-slate-100 text-slate-600", ADMIN: "bg-violet-100 text-violet-700", SUPER_ADMIN: "bg-amber-100 text-amber-700",
  };
  const labels: Record<UserRole, string> = { USER: "User", ADMIN: "Admin", SUPER_ADMIN: "Super Admin" };
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[role]}`}>{labels[role]}</span>;
}

// ── Mini bar chart ──────────────────────────────────────────────────────────────

function MiniBarChart({ data, color, label }: { data: { date: string; count: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const shown = data.slice(-30);
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
      <div className="flex items-end gap-0.5 h-16">
        {shown.map((d, i) => (
          <div key={i} title={`${d.date}: ${d.count}`}
            className={`flex-1 rounded-sm ${color} transition-all`}
            style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`, minHeight: "2px" }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 mt-1">
        <span>{shown[0]?.date?.slice(5)}</span><span>{shown[shown.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

// ── User Detail Modal ──────────────────────────────────────────────────────────

function UserDetailModal({ userId, onClose, onUserUpdated }: {
  userId: string; onClose: () => void; onUserUpdated: (userId: string, changes: Partial<AdminUser>) => void;
}) {
  const { show: showToast } = useToast();
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    apiFetch(`/api/admin/users/${userId}`).then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); }).finally(() => setLoading(false));
  }, [userId]);

  const handleDisable = async (disable: boolean) => {
    if (!data) return;
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, action: disable ? "disable" : "enable" }),
      });
      const json = await res.json();
      if (res.ok) {
        setData((prev) => prev ? { ...prev, user: { ...prev.user, isDisabled: disable } } : prev);
        onUserUpdated(userId, { isDisabled: disable });
        showToast(`User ${disable ? "disabled" : "enabled"} successfully.`, "success");
      } else { showToast(json.error ?? "Failed to update user", "error"); }
    } catch { showToast("Network error", "error"); } finally { setActionLoading(false); }
  };

  const user = data?.user;
  const activityMax = Math.max(...(data?.activitySeries.map((a) => a.count) ?? [1]), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">User Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"><BiX className="text-lg" /></button>
        </div>
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : !user ? (
          <div className="p-8 text-center text-slate-500">Failed to load user details.</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 text-lg">{user.name}</p>
                  <RoleBadge role={user.role} />
                  {user.isDisabled && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Disabled</span>}
                </div>
                <p className="text-sm text-slate-500">{user.email}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  {user.jobTitle && <span>{user.jobTitle}{user.company ? ` @ ${user.company}` : ""}</span>}
                  {user.location && <span>📍 {user.location}</span>}
                  {user.website && <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">{user.website}</a>}
                </div>
              </div>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[{ label: "Projects", value: user._count.projects }, { label: "Active Sessions", value: user._count.sessions }, { label: "API Keys", value: user._count.apiKeys }].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Account info */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-3">Account Info</p>
              {[
                { label: "Email Verified", value: user.isEmailVerified ? "✅ Yes" : "❌ No" },
                { label: "2FA Enabled", value: user.twoFactorEnabled ? "✅ Yes" : "❌ No" },
                { label: "Failed Logins", value: String(user.failedLoginAttempts) },
                { label: "Account Locked", value: user.lockedUntil && new Date(user.lockedUntil) > new Date() ? `Until ${formatDate(user.lockedUntil)}` : "No" },
                { label: "Joined", value: formatDate(user.createdAt) },
                { label: "Last Updated", value: formatDate(user.updatedAt) },
                ...(user.isDisabled && user.disabledAt ? [{ label: "Disabled At", value: formatDate(user.disabledAt) }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800 text-right">{value}</span>
                </div>
              ))}
            </div>
            {/* Activity chart */}
            {data!.activitySeries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Content Activity (last 30 days)</p>
                <div className="flex items-end gap-0.5 h-16 bg-slate-50 rounded-xl p-2">
                  {data!.activitySeries.map((a, i) => (
                    <div key={i} title={`${a.date}: ${a.count} saves`}
                      className="flex-1 bg-violet-400 rounded-sm transition-all"
                      style={{ height: `${Math.max((a.count / activityMax) * 100, a.count > 0 ? 10 : 2)}%`, minHeight: "2px" }} />
                  ))}
                </div>
              </div>
            )}
            {/* Recent projects */}
            {data!.projects.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Recent Projects</p>
                <div className="space-y-2">
                  {data!.projects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl text-sm">
                      <div><p className="font-medium text-slate-800">{p.title}</p><p className="text-xs text-slate-400">{p.category} · {p._count.sections} sections</p></div>
                      <span className="text-xs text-slate-400 shrink-0">{formatDate(p.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Actions */}
            {user.role !== "SUPER_ADMIN" && (
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="button" disabled={actionLoading} onClick={() => handleDisable(!user.isDisabled)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                    user.isDisabled ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}>
                  {user.isDisabled ? <><BiLock /> Enable Account</> : <><BiBlock /> Disable Account</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Promote to Super Admin Modal ───────────────────────────────────────────────

function PromoteModal({ user, onClose, onDone }: {
  user: AdminUser; onClose: () => void; onDone: (userId: string) => void;
}) {
  const { show: showToast } = useToast();
  const [confirmKey, setConfirmKey] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const ALL_PERMISSIONS = ["manage_users","manage_projects","view_analytics","manage_settings","manage_api_keys","view_all_projects"];
  const toggle = (p: string) => setPermissions((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handlePromote = async () => {
    if (confirmKey !== "CONFIRM_SUPER_ADMIN") { showToast("Confirmation key does not match", "error"); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "promoteToSuperAdmin", permissions, confirmKey }),
      });
      const json = await res.json();
      if (res.ok) { showToast(`${user.name} promoted to Super Admin`, "success"); onDone(user.id); onClose(); }
      else { showToast(json.error ?? "Failed to promote", "error"); }
    } catch { showToast("Network error", "error"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Promote to Super Admin</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"><BiX /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-sm text-amber-800">
            <BiInfoCircle className="text-amber-500 mt-0.5 shrink-0" />
            <span>You are about to promote <strong>{user.name}</strong> to Super Admin. This grants full platform access.</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Assign Permissions</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map((p) => (
                <button key={p} type="button" onClick={() => toggle(p)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                    permissions.includes(p) ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:border-violet-300 bg-white"}`}>
                  {p.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Type <code className="bg-slate-100 px-1 rounded font-mono">CONFIRM_SUPER_ADMIN</code> to confirm
            </label>
            <input type="text" value={confirmKey} onChange={(e) => setConfirmKey(e.target.value)}
              placeholder="CONFIRM_SUPER_ADMIN"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 font-mono" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
            <button onClick={handlePromote} disabled={loading || confirmKey !== "CONFIRM_SUPER_ADMIN"}
              className="flex-1 py-2.5 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-semibold disabled:opacity-50 transition-colors">
              {loading ? "Promoting…" : "Promote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const ADMIN_TABS = ["overview", "users"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

const FILTER_OPTIONS = [
  { label: "All users", value: "" }, { label: "Verified", value: "verified" },
  { label: "Unverified", value: "unverified" }, { label: "Disabled", value: "disabled" },
  { label: "Admins", value: "admin" }, { label: "Super Admins", value: "superadmin" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { show: showToast, ToastNode } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [promoteUser, setPromoteUser] = useState<AdminUser | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { const res = await apiFetch("/api/admin/stats"); if (res.ok) setStats((await res.json()).data); }
    catch { /* ignore */ } finally { setStatsLoading(false); }
  }, []);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try { const res = await apiFetch("/api/admin/activity"); if (res.ok) setActivity((await res.json()).data); }
    catch { /* ignore */ } finally { setActivityLoading(false); }
  }, []);

  const fetchUsers = useCallback(async (q: string, p: number, f: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ search: q, page: String(p), limit: "15", filter: f });
      const res = await apiFetch(`/api/admin/users?${params}`);
      if (res.ok) { const json = await res.json(); setUsers(json.data.users); setPagination(json.data.pagination); }
    } catch { /* ignore */ } finally { setUsersLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); fetchActivity(); }, [fetchStats, fetchActivity]);
  useEffect(() => { fetchUsers(search, page, filter); }, [fetchUsers, page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); fetchUsers(search, 1, filter); }, 350); return () => clearTimeout(t); }, [search]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); fetchUsers(search, 1, filter); }, [filter]);

  const handleDisableToggle = async (user: AdminUser) => {
    setActionLoadingId(user.id);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: user.isDisabled ? "enable" : "disable" }),
      });
      const json = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isDisabled: !user.isDisabled } : u));
        showToast(`${user.name} ${user.isDisabled ? "enabled" : "disabled"} successfully.`, "success");
      } else { showToast(json.error ?? "Failed", "error"); }
    } catch { showToast("Network error", "error"); } finally { setActionLoadingId(null); }
  };

  const handleRoleChange = async (user: AdminUser, newRole: "USER" | "ADMIN") => {
    setActionLoadingId(user.id);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "setRole", role: newRole }),
      });
      const json = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
        showToast(`${user.name} is now ${newRole === "ADMIN" ? "an Admin" : "a User"}`, "success");
      } else { showToast(json.error ?? "Failed to update role", "error"); }
    } catch { showToast("Network error", "error"); } finally { setActionLoadingId(null); }
  };

  const handleUserUpdated = (userId: string, changes: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...changes } : u));
  };

  const goToUsersWithFilter = (f: string) => { setFilter(f); setActiveTab("users"); };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 sm:px-8 sm:pt-7 bg-zinc-100 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BiShield className="text-amber-500 text-xl" />
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Manage users and monitor platform activity</p>
          </div>
          <button onClick={() => { fetchStats(); fetchActivity(); fetchUsers(search, page, filter); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm">
            <BiRefresh className="text-base" /> Refresh
          </button>
        </div>
        <div className="flex gap-1 mt-5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {ADMIN_TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                activeTab === tab ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {tab === "overview" && <BiBarChart className="text-base" />}
              {tab === "users" && <BiGroup className="text-base" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 space-y-5">

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={<BiGroup />} color="bg-violet-500" loading={statsLoading} onClick={() => goToUsersWithFilter("")} />
              <StatCard label="Verified Users" value={stats?.verifiedUsers ?? 0} icon={<BiUserCheck />} color="bg-emerald-500" loading={statsLoading} onClick={() => goToUsersWithFilter("verified")} />
              <StatCard label="Unverified Users" value={stats?.unverifiedUsers ?? 0} icon={<BiCheckCircle />} color="bg-amber-500" loading={statsLoading} onClick={() => goToUsersWithFilter("unverified")} />
              <StatCard label="Disabled Users" value={stats?.disabledUsers ?? 0} icon={<BiBlock />} color="bg-red-500" loading={statsLoading} onClick={() => goToUsersWithFilter("disabled")} />
              <StatCard label="Total Projects" value={stats?.totalProjects ?? 0} icon={<BiFolder />} color="bg-sky-500" loading={statsLoading} />
              <StatCard label="Public Projects" value={stats?.publicProjects ?? 0} icon={<BiGlobe />} color="bg-teal-500" loading={statsLoading} />
              <StatCard label="Active Sessions" value={stats?.activeSessions ?? 0} icon={<BiLockOpen />} color="bg-pink-500" loading={statsLoading} />
            </div>

            {stats && !statsLoading && stats.totalUsers > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Platform Health</h3>
                <div className="space-y-3">
                  {[
                    { label: "Email verification rate", value: Math.round((stats.verifiedUsers / stats.totalUsers) * 100), color: "bg-emerald-500" },
                    { label: "Public project ratio", value: stats.totalProjects > 0 ? Math.round((stats.publicProjects / stats.totalProjects) * 100) : 0, color: "bg-sky-500" },
                    { label: "Disabled accounts", value: Math.round((stats.disabledUsers / stats.totalUsers) * 100), color: "bg-red-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{label}</span><span className="font-semibold text-slate-700">{value}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Platform Activity (last 30 days)</h3>
                {activityLoading && <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />}
              </div>
              {activity && !activityLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <MiniBarChart data={activity.logins} color="bg-violet-400" label="Logins / Day" />
                  <MiniBarChart data={activity.signups} color="bg-emerald-400" label="New Signups / Day" />
                  <MiniBarChart data={activity.projects} color="bg-sky-400" label="New Projects / Day" />
                  <MiniBarChart data={activity.edits} color="bg-amber-400" label="Content Edits / Day" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── USERS ────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <BiSearch className="text-slate-400 shrink-0" />
              <input type="search" placeholder="Search by name or email…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none bg-transparent" />
              {search && <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600"><BiX /></button>}
              <div className="relative" ref={filterRef}>
                <button type="button" onClick={() => setFilterOpen((o) => !o)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    filter ? "border-violet-400 text-violet-600 bg-violet-50" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {filter ? FILTER_OPTIONS.find((o) => o.value === filter)?.label : "Filter"} <BiChevronDown />
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {FILTER_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => { setFilter(opt.value); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          filter === opt.value ? "bg-violet-50 text-violet-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Projects</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">No users found</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <button type="button" onClick={() => setDetailUserId(user.id)} className="flex items-center gap-3 text-left group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className={`font-medium truncate max-w-[120px] group-hover:text-violet-600 transition-colors ${user.isDisabled ? "text-slate-400 line-through" : "text-slate-800"}`}>
                              {user.name}
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell truncate max-w-[200px]">{user.email}</td>
                        <td className="px-5 py-3.5"><RoleBadge role={user.role} /></td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${user.isEmailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {user.isEmailVerified ? "Verified" : "Unverified"}
                            </span>
                            {user.isDisabled && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 w-fit">Disabled</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">{user._count.projects}</td>
                        <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">{formatDate(user.createdAt)}</td>
                        <td className="px-5 py-3.5 text-right">
                          {user.role === "SUPER_ADMIN" ? (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button disabled={actionLoadingId === user.id}
                                onClick={() => handleRoleChange(user, user.role === "ADMIN" ? "USER" : "ADMIN")}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                                  user.role === "ADMIN" ? "border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50" : "border-violet-200 text-violet-700 hover:bg-violet-50"}`}
                                title={user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}>
                                {actionLoadingId === user.id ? "…" : user.role === "ADMIN" ? "Demote" : "Promote"}
                              </button>
                              {user.role === "ADMIN" && (
                                <button disabled={actionLoadingId === user.id} onClick={() => setPromoteUser(user)}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                                  title="Promote to Super Admin"><BiKey /></button>
                              )}
                              <button disabled={actionLoadingId === user.id} onClick={() => handleDisableToggle(user)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                                  user.isDisabled ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-red-200 text-red-600 hover:bg-red-50"}`}
                                title={user.isDisabled ? "Enable account" : "Disable account"}>
                                {user.isDisabled ? <BiLock /> : <BiBlock />}
                              </button>
                              <button onClick={() => setDetailUserId(user.id)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                title="View profile"><BiUser /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500 text-xs">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><BiChevronLeft /></button>
                  <span className="px-3 text-xs font-medium text-slate-600">{page} / {pagination.totalPages}</span>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><BiChevronRight /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {detailUserId && (
        <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} onUserUpdated={handleUserUpdated} />
      )}
      {promoteUser && (
        <PromoteModal user={promoteUser} onClose={() => setPromoteUser(null)}
          onDone={(userId) => setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: "SUPER_ADMIN" } : u))} />
      )}
      {ToastNode}
    </div>
  );
}