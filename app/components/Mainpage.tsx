"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BiBarChartSquare,
  BiCabinet,
  BiFace,
  BiSlider,
  BiLogOut,
  BiChevronRight,
  BiMenu,
  BiX,
  BiShield,
  BiSupport,
  BiBell,
  BiCheckDouble,
  BiTrash,
} from "react-icons/bi";
import Projects from "./Projects";
import Dashboard from "./Dashboard";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import AdminDashboard from "./admin/AdminDashboard";
import CustomerServicePage from "./CustomerServicePage";
import { useAuth } from "@/app/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import type { AppNotification } from "@/types";
import { formatDate } from "@/lib/utils";

// ─── Notification Bell ────────────────────────────────────────────────

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications ?? []);
        setUnreadCount(json.data.unreadCount ?? 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // poll every 60s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await apiFetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearRead = async () => {
    await apiFetch("/api/notifications", { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  const typeColor: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-colors"
        aria-label="Notifications"
      >
        <BiBell className="text-slate-500 text-base" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} title="Mark all read"
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <BiCheckDouble className="text-base" />
                </button>
              )}
              <button type="button" onClick={clearRead} title="Clear read"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <BiTrash className="text-base" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <BiBell className="text-3xl text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id}
                  className={`px-4 py-3 border-b border-slate-50 last:border-0 ${n.read ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${typeColor[n.type] ?? typeColor.info}`}>
                      {n.type.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
}

function NavItem({ icon, label, active, onClick, danger }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1
        ${danger
          ? "text-red-500 hover:bg-red-50"
          : active
          ? "bg-violet-50 text-violet-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      <span
        className={`text-xl shrink-0 transition-colors ${
          danger
            ? ""
            : active
            ? "text-violet-600"
            : "text-slate-400 group-hover:text-slate-600"
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex-1 text-left tracking-wide">{label}</span>
      {active && !danger && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none">
      {children}
    </p>
  );
}

// ─── Sidebar inner content (shared between desktop & mobile drawer) ───────────

interface SidebarContentProps {
  activeTab: string;
  user: { name?: string | null; email?: string | null; avatarUrl?: string | null; role?: string | null } | null;
  onNav: (tab: string) => void;
  onLogout: () => void;
  mobileMode?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  activeTab,
  user,
  onNav,
  onLogout,
  mobileMode,
  onClose,
}: SidebarContentProps) {
  const avatarInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleNav = (tab: string) => {
    onNav(tab);
    onClose?.();
  };

  return (
    <>
      {/* Logo row */}
      <div className="px-4 py-5 border-b border-slate-100 flex items-center justify-between">
        <Image
          src="/logo.png"
          alt="OnTap Dev"
          width={80}
          height={80}
          className={mobileMode ? "mx-0 h-9 w-auto" : "mx-auto lg:mx-0 h-9 w-auto"}
          priority
        />
        <div className="flex items-center gap-2">
          <NotificationBell />
          {mobileMode && (
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <BiX className="text-xl" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2">
        <SectionLabel>Main</SectionLabel>
        <NavItem
          icon={<BiBarChartSquare />}
          label="Dashboard"
          active={activeTab === "dashboard"}
          onClick={() => handleNav("dashboard")}
        />
        <NavItem
          icon={<BiCabinet />}
          label="Projects"
          active={activeTab === "projects"}
          onClick={() => handleNav("projects")}
        />

        <SectionLabel>Account</SectionLabel>
        <NavItem
          icon={<BiFace />}
          label="Profile"
          active={activeTab === "profile"}
          onClick={() => handleNav("profile")}
        />
        <NavItem
          icon={<BiSlider />}
          label="Settings"
          active={activeTab === "settings"}
          onClick={() => handleNav("settings")}
        />
        <NavItem
          icon={<BiSupport />}
          label="Support"
          active={activeTab === "support"}
          onClick={() => handleNav("support")}
        />

        {/* Admin — visible to ADMIN and SUPER_ADMIN */}
        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <>
            <SectionLabel>Administration</SectionLabel>
            <NavItem
              icon={<BiShield />}
              label="Admin"
              active={activeTab === "admin"}
              onClick={() => handleNav("admin")}
            />
          </>
        )}

        <div className="mt-2 border-t border-slate-100 pt-2">
          <NavItem
            icon={<BiLogOut />}
            label="Log out"
            active={false}
            onClick={onLogout}
            danger
          />
        </div>
      </nav>

      {/* User card */}
      <div
        role="button"
        tabIndex={0}
        aria-label="View your profile"
        onClick={() => handleNav("profile")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleNav("profile");
          }
        }}
        className="mx-3 mb-4 px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 cursor-pointer hover:border-violet-200 hover:bg-violet-50 transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-purple-500 to-violet-600 shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Your avatar" className="w-full h-full object-cover" />
          ) : (
            avatarInitials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
            {user?.name ?? "User"}
          </p>
          <p className="text-xs text-slate-400 truncate leading-tight">
            {user?.email ?? ""}
          </p>
        </div>
        <BiChevronRight
          className="text-slate-300 group-hover:text-violet-400 shrink-0 transition-colors"
          aria-hidden="true"
        />
      </div>
    </>
  );
}

// ─── Mainpage ─────────────────────────────────────────────────────────────────

const TABS = ["dashboard", "projects", "profile", "settings", "support", "admin"] as const;
type Tab = (typeof TABS)[number];

const TAB_PANELS: Record<Tab, React.ReactNode> = {
  dashboard: <Dashboard />,
  projects: <Projects />,
  profile: <ProfilePage />,
  settings: <SettingsPage />,
  support: <CustomerServicePage />,
  admin: <AdminDashboard />,
};

const Mainpage = ({ initialTab = "dashboard" }: { initialTab?: string }) => {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const validInitial = (TABS.includes(initialTab as Tab) ? initialTab : "dashboard") as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(validInitial);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Lazy-mount: only render a panel once it has been visited
  const [visited, setVisited] = useState<Set<Tab>>(new Set([validInitial]));

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  const handleExitImpersonation = useCallback(async () => {
    try {
      await apiFetch("/api/admin/impersonate", { method: "DELETE" });
      await refresh();
    } catch { /* ignore */ }
  }, [refresh]);

  const handleNav = useCallback((tab: string) => {
    const t = (TABS.includes(tab as Tab) ? tab : "dashboard") as Tab;
    setActiveTab(t);
    setVisited((prev) => {
      if (prev.has(t)) return prev;
      const next = new Set(prev);
      next.add(t);
      return next;
    });
  }, []);

  // Escape closes the mobile sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Prevent body scroll while mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  return (
    <div className="w-full h-full flex relative overflow-hidden">

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shadow-sm">
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileSidebarOpen}
          aria-controls="mobile-sidebar"
          onClick={() => setMobileSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <BiMenu className="text-xl" />
        </button>
        <Image src="/logo.png" alt="OnTap Dev" width={28} height={28} priority />
        <span className="font-semibold text-slate-800 text-sm capitalize select-none">
          {activeTab}
        </span>
      </div>

      {/* ── Mobile sidebar backdrop ────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        id="mobile-sidebar"
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          h-full w-72 lg:w-60 shrink-0
          bg-white border-r border-slate-200
          flex flex-col
          transition-transform duration-300 ease-in-out
          will-change-transform
          ${mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
        `}
        aria-label="Application sidebar"
      >
        <SidebarContent
          activeTab={activeTab}
          user={user}
          onNav={handleNav}
          onLogout={handleLogout}
          mobileMode={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main
        role="main"
        className="h-full flex-1 overflow-x-hidden bg-zinc-100 pt-14 lg:pt-0 min-w-0 flex flex-col"
      >
        {/* Impersonation Banner */}
        {user?.isImpersonation && (
          <div className="shrink-0 bg-amber-500 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm z-20">
            <div className="flex items-center gap-2 min-w-0">
              <BiShield className="text-lg shrink-0" />
              <span className="font-semibold truncate">Impersonating: {user.name}</span>
              <span className="opacity-80 hidden sm:inline whitespace-nowrap">— Viewing as admin</span>
            </div>
            <button
              type="button"
              onClick={handleExitImpersonation}
              className="shrink-0 bg-white/20 hover:bg-white/30 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Exit Impersonation
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
        {TABS.map((tab) =>
          visited.has(tab) ? (
            <div
              key={tab}
              role="tabpanel"
              aria-label={`${tab} panel`}
              className={`h-full w-full overflow-y-auto ${activeTab === tab ? "block" : "hidden"}`}
            >
              {TAB_PANELS[tab]}
            </div>
          ) : null
        )}
        </div>
      </main>
    </div>
  );
};

export default Mainpage;
