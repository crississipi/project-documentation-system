"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from "recharts";
import { BiCalendar, BiTime, BiEditAlt, BiText, BiTrendingUp } from "react-icons/bi";
import { apiFetch } from "@/lib/apiFetch";

type Range = "today" | "yesterday" | "week" | "month" | "custom";

interface TimelineBucket { label: string; saves: number; words: number; chars: number }
interface ProjectBucket  { name: string; saves: number; words: number; sections: number }
interface HourBucket     { hour: string; count: number }
interface Summary {
  totalSaves: number; totalWords: number; activeDays: number;
  peakHour: string | null; granularity: "hour" | "day"; range: string;
}

interface ActivityData {
  timeline: TimelineBucket[];
  byProject: ProjectBucket[];
  hourlyHeatmap: HourBucket[];
  summary: Summary;
}

const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: "today",     label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week",      label: "Last 7 Days" },
  { key: "month",     label: "This Month" },
  { key: "custom",    label: "Custom Range" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function nDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Truncate long project names for bar chart labels
function shortName(name: string, max = 14) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3.5 py-3 text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-2 pb-1.5 border-b border-slate-100">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: entry.color }} />
            <span className="text-slate-500">{entry.name}</span>
          </div>
          <span className="font-semibold text-slate-800">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-between">
          <span className="text-slate-400">Total</span>
          <span className="font-semibold text-slate-700">
            {payload.reduce((s: number, e: {value: number}) => s + (e.value ?? 0), 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};

export function ActivityPanel() {
  const [range, setRange]         = useState<Range>("week");
  const [from, setFrom]           = useState(nDaysAgo(6));
  const [to, setTo]               = useState(today());
  const [data, setData]           = useState<ActivityData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeChart, setActiveChart] = useState<"words" | "saves">("words");

  const load = useCallback(async () => {
    setLoading(true);
    let url = `/api/dashboard/activity?range=${range}`;
    if (range === "custom") url += `&from=${from}&to=${to}`;
    const res = await apiFetch(url);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [range, from, to]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;
  const timeline = data?.timeline ?? [];
  const byProject = data?.byProject ?? [];
  const heatmap = data?.hourlyHeatmap ?? [];
  const peakHeat = Math.max(...heatmap.map((h) => h.count), 1);

  // Stat cards
  const stats = [
    { label: "Save Events",   value: summary?.totalSaves  ?? 0, icon: <BiEditAlt />,    color: "text-violet-600 bg-violet-50" },
    { label: "Words Written", value: summary?.totalWords  ?? 0, icon: <BiText />,       color: "text-blue-600 bg-blue-50" },
    { label: "Active Days",   value: summary?.activeDays  ?? 0, icon: <BiCalendar />,   color: "text-green-600 bg-green-50" },
    { label: "Peak Hour",     value: summary?.peakHour ?? "—", icon: <BiTime />,       color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header + filters ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BiTrendingUp className="text-violet-500 text-xl" />
          <h2 className="font-semibold text-slate-800 text-base">Activity & Progress</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range quick-select */}
          <div className="overflow-x-auto max-w-full">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white whitespace-nowrap min-w-max">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors ${
                  range === opt.key
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          </div>

          {/* Custom date picker */}
          {range === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-400 bg-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={to}
                min={from}
                max={today()}
                onChange={(e) => setTo(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-400 bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Summary stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${s.color}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-lg leading-none truncate">
                {loading ? (
                  <span className="inline-block w-12 h-4 bg-slate-100 rounded animate-pulse" />
                ) : typeof s.value === "number" ? (
                  s.value.toLocaleString()
                ) : (
                  s.value
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Area/Line chart – content over time ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-800">
            {summary?.granularity === "hour" ? "Activity by Hour" : "Daily Activity"}
          </p>
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setActiveChart("words")}
              className={`px-3 py-1 font-medium transition-colors ${activeChart === "words" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Words
            </button>
            <button
              type="button"
              onClick={() => setActiveChart("saves")}
              className={`px-3 py-1 font-medium transition-colors ${activeChart === "saves" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Saves
            </button>
          </div>
        </div>
        {loading ? (
          <div className="h-52 rounded-xl bg-slate-50 animate-pulse" />
        ) : timeline.every((t) => (activeChart === "words" ? t.words : t.saves) === 0) ? (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
            No activity in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={activeChart === "words" ? "words" : "saves"}
                name={activeChart === "words" ? "Words" : "Saves"}
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bottom row: project bar chart + hourly heatmap ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart – by project */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Words by Project</p>
          {loading ? (
            <div className="h-48 rounded-xl bg-slate-50 animate-pulse" />
          ) : byProject.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={byProject.map((p) => ({ ...p, name: shortName(p.name) }))}
                margin={{ top: 4, right: 4, left: -20, bottom: 20 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Bar dataKey="words" name="Words" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saves" name="Saves" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hourly activity distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Activity by Hour of Day</p>
          {loading ? (
            <div className="h-48 rounded-xl bg-slate-50 animate-pulse" />
          ) : heatmap.every((h) => h.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <>
              {/* Mini heatmap grid — 24 cells */}
              <div className="grid grid-cols-12 gap-1 mb-3">
                {heatmap.map((h, i) => {
                  const intensity = peakHeat > 0 ? h.count / peakHeat : 0;
                  const bg = intensity === 0
                    ? "bg-slate-100"
                    : intensity < 0.25
                    ? "bg-violet-100"
                    : intensity < 0.5
                    ? "bg-violet-300"
                    : intensity < 0.75
                    ? "bg-violet-500"
                    : "bg-violet-700";
                  return (
                    <div
                      key={i}
                      title={`${h.hour}: ${h.count} saves`}
                      className={`h-6 rounded-sm ${bg} cursor-default transition-colors`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-3 px-0.5">
                <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={heatmap} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" name="Saves" stroke="#6d28d9" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
