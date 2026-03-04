"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { BiCheckCircle, BiErrorCircle, BiLoaderAlt, BiLogIn } from "react-icons/bi";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/app/context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  VIEWER: "View only",
  COMMENTER: "Comment & suggest",
  EDITOR: "Full edit access",
};

interface InviteInfo {
  projectTitle: string;
  inviterName: string;
  role: string;
  status: string;
  invitedEmail: string;
  projectId?: string;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const pathname = usePathname();

  // Extract real token from the URL path (/invite/<token>) — same pattern as
  // ProjectPage: useParams() may return the static placeholder "_" before the
  // client router syncs to the actual browser URL.
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const fromPath = segments[0] === "invite" ? (segments[1] ?? "") : "";
  const token = (fromPath && fromPath !== "_") ? fromPath
    : (params?.token && params.token !== "_") ? params.token
    : fromPath ?? params?.token ?? "";

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "accepting" | "accepted" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setInfo(json.data);
          setState(json.data.status === "ACCEPTED" ? "accepted" : "ready");
        } else {
          setErrorMsg(json.error ?? "Invalid invite link.");
          setState("error");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load invite. Please try again.");
        setState("error");
      });
  }, [token]);

  const accept = async () => {
    setState("accepting");
    const res = await apiFetch(`/api/invite/${token}`, { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setState("accepted");
      setTimeout(() => router.push(`/projects/${json.data.projectId}`), 1800);
    } else {
      setErrorMsg(json.error ?? "Failed to accept invite.");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {/* Logo / brand */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center mx-auto mb-5">
          <span className="text-white font-bold text-lg">O</span>
        </div>
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-6">OnTap Dev Documentation</p>

        {state === "loading" && (
          <>
            <BiLoaderAlt className="text-3xl text-violet-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading invitation…</p>
          </>
        )}

        {state === "error" && (
          <>
            <BiErrorCircle className="text-4xl text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Invitation Unavailable</h2>
            <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {(state === "ready" || state === "accepting") && info && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-1">You&apos;re invited!</h2>
            <p className="text-sm text-slate-500 mb-6">
              <strong>{info.inviterName}</strong> has invited you to collaborate on
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <p className="font-semibold text-slate-900 text-base">{info.projectTitle}</p>
              <span className="inline-block mt-2 text-xs font-medium px-3 py-1 bg-violet-100 text-violet-700 rounded-full">
                {ROLE_LABELS[info.role] ?? info.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Sent to <strong>{info.invitedEmail}</strong>
            </p>
            {authLoading ? (
              <div className="w-full py-3 flex items-center justify-center">
                <BiLoaderAlt className="text-xl text-violet-400 animate-spin" />
              </div>
            ) : user ? (
              <button
                type="button"
                onClick={accept}
                disabled={state === "accepting"}
                className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {state === "accepting" ? "Accepting…" : "Accept Invitation"}
              </button>
            ) : (
              <>
                <p className="text-xs text-amber-600 mb-3">You need to log in to accept this invitation.</p>
                <button
                  type="button"
                  onClick={() => router.push(`/login?redirect=/invite/${token}`)}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                >
                  <BiLogIn className="text-lg" /> Log in to Accept
                </button>
              </>
            )}
          </>
        )}

        {state === "accepted" && (
          <>
            <BiCheckCircle className="text-4xl text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">You&apos;re in!</h2>
            <p className="text-sm text-slate-500">
              You now have access to <strong>{info?.projectTitle}</strong>. Redirecting…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
