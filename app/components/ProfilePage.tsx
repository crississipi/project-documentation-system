"use client";

import { useEffect, useRef, useState } from "react";
import {
  BiUser, BiEnvelope, BiPhone, BiPen, BiBriefcase,
  BiBuilding, BiGlobe, BiMap, BiCamera, BiX,
  BiShield, BiCalendar, BiEdit,
} from "react-icons/bi";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/app/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { UserProfile } from "@/types";

// ─── Small helpers ────────────────────────────────────────────────────────────


function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Input field ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
  textarea?: boolean;
}

function Field({ label, icon, value, onChange, type = "text", placeholder, readOnly, hint, textarea }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-base text-slate-400">{icon}</span>
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          readOnly={readOnly}
          className={`w-full px-3.5 py-2.5 text-sm border rounded-xl resize-none focus:outline-none transition-colors ${
            readOnly
              ? "bg-slate-50 border-slate-200 text-slate-500 cursor-default"
              : "bg-white border-slate-200 focus:border-violet-400"
          }`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none transition-colors ${
            readOnly
              ? "bg-slate-50 border-slate-200 text-slate-500 cursor-default"
              : "bg-white border-slate-200 focus:border-violet-400"
          }`}
        />
      )}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}


// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Personal", "Professional"] as const;
type Tab = typeof TABS[number];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Personal");
  const { show: showToastMsg, ToastNode } = useToast();
  const [dirty, setDirty]       = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [bio, setBio]           = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany]   = useState("");
  const [website, setWebsite]   = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/profile");
      const json = await res.json();
      if (res.ok && json.data) {
        const p: UserProfile = json.data;
        setProfile(p);
        setName(p.name);
        setPhone(p.phone ?? "");
        setBio(p.bio ?? "");
        setJobTitle(p.jobTitle ?? "");
        setCompany(p.company ?? "");
        setWebsite(p.website ?? "");
        setLocation(p.location ?? "");
        setAvatarUrl(p.avatarUrl);
        setDirty(false);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const showToast = (message: string, type: "success" | "error") => {
    showToastMsg(message, type);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Photo must be under 2 MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, bio, jobTitle, company, website, location, avatarUrl }),
      });
      const json = await res.json();
      if (res.ok) {
        setProfile(json.data);
        setDirty(false);
        await refresh(); // update sidebar avatar/name
        showToast("Profile saved", "success");
      } else {
        showToast(json.error ?? "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setName(profile.name);
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setJobTitle(profile.jobTitle ?? "");
    setCompany(profile.company ?? "");
    setWebsite(profile.website ?? "");
    setLocation(profile.location ?? "");
    setAvatarUrl(profile.avatarUrl);
    setDirty(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const field = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  // ── Skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <div className="w-24 h-24 rounded-full bg-slate-200 animate-pulse" />
        <div className="w-48 h-4 rounded-full bg-slate-200 animate-pulse" />
        <div className="w-32 h-3 rounded-full bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100 overflow-hidden">
      {/* ── Banner + avatar hero ───────────────────────────────────────── */}
      <div className="relative shrink-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600" style={{ height: "140px" }}>
        {/* Rounded bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-zinc-100 rounded-t-3xl" />

        {/* Avatar — anchored to the bottom of the banner */}
        <div className="absolute left-8" style={{ bottom: "-40px" }}>
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl ring-4 ring-zinc-100 overflow-hidden bg-gradient-to-tr from-sky-500 via-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">
                  {initials(name || user?.name || "U")}
                </span>
              )}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center shadow hover:bg-violet-700 transition-colors">
              <BiCamera className="text-sm" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={handleAvatarFile} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* ── Profile name row (sits below banner, accounts for avatar overhang) ── */}
        <div className="bg-white border-b border-slate-200 shadow-sm px-4 sm:px-8 pt-14 pb-4">
          <div className="flex items-start justify-between gap-4">
            {/* Name + meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-900">{name || profile?.name || "—"}</h2>
                {profile?.role === "ADMIN" && (
                  <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">Admin</span>
                )}
                {profile?.isEmailVerified ? (
                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1">
                    <BiShield className="text-sm" /> Verified
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Unverified</span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {jobTitle && company ? `${jobTitle} at ${company}` : jobTitle || company || profile?.email || ""}
              </p>
              {profile?.createdAt && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <BiCalendar className="text-sm" /> Member since {formatDate(profile.createdAt)}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="shrink-0 flex items-center gap-2 mt-1">
              {dirty && !saving && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <BiX className="text-base" />
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  dirty && !saving
                    ? "bg-violet-600 hover:bg-violet-700 text-white shadow"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                ) : (
                  <BiEdit className="text-base" />
                )}
                {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 pt-6">

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Email", value: profile?.email ?? "—", icon: <BiEnvelope /> },
            { label: "Phone", value: phone || "—", icon: <BiPhone /> },
            { label: "Location", value: location || "—", icon: <BiMap /> },
            { label: "Company", value: company || "—", icon: <BiBuilding /> },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-slate-400 text-base mb-1">{s.icon}</div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">{s.label}</p>
              <p className="text-sm text-slate-800 font-semibold truncate">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Tab strip */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-1 pt-1">
            {TABS.map((tab) => (
              <button key={tab} type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-colors ${
                  activeTab === tab
                    ? "bg-white text-violet-600 shadow-sm border-b-2 border-violet-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {activeTab === "Personal" && (
              <>
                <Field label="Full Name" icon={<BiUser />} value={name}
                  onChange={field(setName)} placeholder="Your full name" />
                <Field label="Email Address" icon={<BiEnvelope />} value={profile?.email ?? ""}
                  onChange={() => {}} readOnly
                  hint="Email cannot be changed here — contact support" />
                <Field label="Phone Number" icon={<BiPhone />} value={phone}
                  onChange={field(setPhone)} type="tel" placeholder="+63 912 345 6789" />
                <div className="sm:col-span-2">
                  <Field label="Bio" icon={<BiPen />} value={bio}
                    onChange={field(setBio)} textarea
                    placeholder="A short bio about yourself…" />
                </div>
              </>
            )}

            {activeTab === "Professional" && (
              <>
                <Field label="Job Title" icon={<BiBriefcase />} value={jobTitle}
                  onChange={field(setJobTitle)} placeholder="e.g. Senior Developer" />
                <Field label="Company / Organization" icon={<BiBuilding />} value={company}
                  onChange={field(setCompany)} placeholder="e.g. Chrysalis Tech" />
                <Field label="Website" icon={<BiGlobe />} value={website}
                  onChange={field(setWebsite)} type="url" placeholder="https://yoursite.com" />
                <Field label="Location" icon={<BiMap />} value={location}
                  onChange={field(setLocation)} placeholder="e.g. Manila, Philippines" />
              </>
            )}
          </div>
        </div>
        </div>{/* end px-6 pt-6 */}
      </div>{/* end flex-1 overflow-y-auto */}

      {ToastNode}
    </div>
  );
}
