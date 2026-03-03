"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
} from "react-icons/bi";
import Projects from "./Projects";
import Dashboard from "./Dashboard";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import AdminDashboard from "./admin/AdminDashboard";
import { useAuth } from "@/app/context/AuthContext";

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
          className={mobileMode ? "mx-0 h-9 w-auto" : "mx-auto"}
          priority
        />
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

const TABS = ["dashboard", "projects", "profile", "settings", "admin"] as const;
type Tab = (typeof TABS)[number];

const TAB_PANELS: Record<Tab, React.ReactNode> = {
  dashboard: <Dashboard />,
  projects: <Projects />,
  profile: <ProfilePage />,
  settings: <SettingsPage />,
  admin: <AdminDashboard />,
};

const Mainpage = ({ initialTab = "dashboard" }: { initialTab?: string }) => {
  const { user, logout } = useAuth();
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
          flex flex-col overflow-hidden
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
        className="h-full flex-1 overflow-x-hidden bg-zinc-100 pt-14 lg:pt-0 min-w-0"
      >
        {TABS.map((tab) =>
          visited.has(tab) ? (
            <div
              key={tab}
              role="tabpanel"
              aria-label={`${tab} panel`}
              className={`h-full w-full ${activeTab === tab ? "block" : "hidden"}`}
            >
              {TAB_PANELS[tab]}
            </div>
          ) : null
        )}
      </main>
    </div>
  );
};

export default Mainpage;
