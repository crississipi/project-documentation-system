"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiCabinet, BiPlus, BiTrendingUp, BiFile } from "react-icons/bi";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/Button";
import { ActivityPanel } from "@/app/components/dashboard/ActivityPanel";
import { NewProjectModal } from "@/app/components/projects/NewProjectModal";
import { formatDate, getGreeting } from "@/lib/utils";
import type { ProjectSummary } from "@/types";
import { apiFetch } from "@/lib/apiFetch";

const Dashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    apiFetch("/api/projects")
      .then((r) => r.json())
      .then((j) => { if (j.success) setProjects(j.data ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const recent = projects.slice(0, 4);
  const totalSections = projects.reduce((a, p) => a + p.sectionCount, 0);

  return (
    <div className="w-full h-full flex flex-col px-4 py-4 sm:px-8 sm:py-6 lg:px-10 gap-6 overflow-y-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {getGreeting()}, {user?.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here's what's happening with your documentation.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total Projects", value: projects.length, icon: <BiCabinet className="text-2xl" />, color: "bg-violet-100 text-violet-600" },
          { label: "Total Sections", value: totalSections, icon: <BiFile className="text-2xl" />, color: "bg-blue-100 text-blue-600" },
          { label: "This Month", value: projects.filter((p) => new Date(p.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, icon: <BiTrendingUp className="text-2xl" />, color: "bg-green-100 text-green-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {loading
                  ? <span className="block w-10 h-7 bg-slate-200 rounded-lg animate-pulse mt-0.5" />
                  : stat.value}
              </p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Recent Projects</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
            View All
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 flex flex-col items-center text-center">
            <BiCabinet className="text-4xl text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No projects yet. Create your first one!</p>
            <Button size="sm" className="mt-4 gap-1" onClick={() => setShowNewProject(true)}>
              <BiPlus /> New Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map((p) => (
              <button key={p.id} type="button" onClick={() => router.push(`/projects/${p.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-violet-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800 text-sm truncate">{p.title}</p>
                  <span className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5 shrink-0">{p.paperSize}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">{p.category}</p>
                <p className="text-xs text-slate-400 mt-2">{formatDate(p.updatedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity & Progress Charts */}
      <ActivityPanel />

      {/* New Project Modal */}
      <NewProjectModal
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreated={(project) => {
          setShowNewProject(false);
          router.push(`/projects/${project.id}`);
        }}
      />
    </div>
  );
};



export default Dashboard;
