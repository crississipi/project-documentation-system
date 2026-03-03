"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BiBarChart,
  BiGroup,
  BiShield,
  BiSearch,
  BiChevronLeft,
  BiChevronRight,
  BiRefresh,
  BiUserCheck,
  BiCheckCircle,
  BiLockOpen,
  BiFolder,
  BiGlobe,
  BiX,
} from "react-icons/bi";
import { useToast } from "@/app/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  totalProjects: number;
  publicProjects: number;
  activeSessions: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  _count: { projects: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white text-xl shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        )}
      </div>
    </div>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    USER: "bg-slate-100 text-slate-600",
    ADMIN: "bg-violet-100 text-violet-700",
    SUPER_ADMIN: "bg-amber-100 text-amber-700",
  };
  const labels: Record<UserRole, string> = {
    USER: "User",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super Admin",
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[role]}`}>
      {labels[role]}
    </span>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const ADMIN_TABS = ["overview", "users"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { show: showToast, ToastNode } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // ── Stats state ───
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Users state ───
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // ── Confirm disable 2FA modal ───
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ search: q, page: String(p), limit: "15" });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data.users);
        setPagination(json.data.pagination);
      }
    } catch { /* ignore */ }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(search, page); }, [fetchUsers, search, page]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchUsers(search, 1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRoleChange = async (user: AdminUser, newRole: "USER" | "ADMIN") => {
    setPromotingId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      const json = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
        showToast(`${user.name} is now ${newRole === "ADMIN" ? "an Admin" : "a User"}`, "success");
      } else {
        showToast(json.error ?? "Failed to update role", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setPromotingId(null);
    }
  };

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
            <p className="text-sm text-slate-500 mt-0.5">
              Manage users and monitor platform activity
            </p>
          </div>
          <button
            onClick={() => { fetchStats(); fetchUsers(search, page); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
          >
            <BiRefresh className="text-base" />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                activeTab === tab
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Total Users"
                value={stats?.totalUsers ?? 0}
                icon={<BiGroup />}
                color="bg-violet-500"
                loading={statsLoading}
              />
              <StatCard
                label="Verified Users"
                value={stats?.verifiedUsers ?? 0}
                icon={<BiUserCheck />}
                color="bg-emerald-500"
                loading={statsLoading}
              />
              <StatCard
                label="Unverified Users"
                value={stats?.unverifiedUsers ?? 0}
                icon={<BiCheckCircle />}
                color="bg-amber-500"
                loading={statsLoading}
              />
              <StatCard
                label="Total Projects"
                value={stats?.totalProjects ?? 0}
                icon={<BiFolder />}
                color="bg-sky-500"
                loading={statsLoading}
              />
              <StatCard
                label="Public Projects"
                value={stats?.publicProjects ?? 0}
                icon={<BiGlobe />}
                color="bg-teal-500"
                loading={statsLoading}
              />
              <StatCard
                label="Active Sessions"
                value={stats?.activeSessions ?? 0}
                icon={<BiLockOpen />}
                color="bg-pink-500"
                loading={statsLoading}
              />
            </div>

            {/* Quick ratios */}
            {stats && !statsLoading && stats.totalUsers > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Platform Health</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Email verification rate</span>
                      <span className="font-semibold text-slate-700">
                        {Math.round((stats.verifiedUsers / stats.totalUsers) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(stats.verifiedUsers / stats.totalUsers) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Public project ratio</span>
                      <span className="font-semibold text-slate-700">
                        {stats.totalProjects > 0
                          ? Math.round((stats.publicProjects / stats.totalProjects) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all"
                        style={{
                          width: stats.totalProjects > 0
                            ? `${(stats.publicProjects / stats.totalProjects) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── USERS ────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Search bar */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <BiSearch className="text-slate-400 shrink-0" />
              <input
                type="search"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                  <BiX />
                </button>
              )}
            </div>

            {/* Table */}
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
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-slate-200 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800 truncate max-w-[120px]">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell truncate max-w-[200px]">
                          {user.email}
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            user.isEmailVerified
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {user.isEmailVerified ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                          {user._count.projects}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {user.role === "SUPER_ADMIN" ? (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          ) : (
                            <button
                              disabled={promotingId === user.id}
                              onClick={() =>
                                handleRoleChange(user, user.role === "ADMIN" ? "USER" : "ADMIN")
                              }
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                                user.role === "ADMIN"
                                  ? "border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
                                  : "border-violet-200 text-violet-700 hover:bg-violet-50"
                              }`}
                            >
                              {promotingId === user.id
                                ? "…"
                                : user.role === "ADMIN"
                                ? "Demote"
                                : "Promote"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500 text-xs">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <BiChevronLeft />
                  </button>
                  <span className="px-3 text-xs font-medium text-slate-600">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <BiChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm modal for destructive action */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Confirm role change</h3>
            <p className="text-sm text-slate-600">
              Change <strong>{confirmUser.name}</strong> from{" "}
              <strong>{confirmUser.role}</strong> to{" "}
              <strong>{confirmUser.role === "ADMIN" ? "USER" : "ADMIN"}</strong>?
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmUser(null)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRoleChange(
                    confirmUser,
                    confirmUser.role === "ADMIN" ? "USER" : "ADMIN"
                  );
                  setConfirmUser(null);
                }}
                className="flex-1 py-2 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastNode}
    </div>
  );
}
