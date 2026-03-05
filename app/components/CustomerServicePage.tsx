"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BiSupport, BiSend, BiPaperclip, BiX, BiRefresh, BiCheckCircle,
  BiTime, BiLoader, BiImage, BiMessageAltDetail,
} from "react-icons/bi";
import { useToast } from "@/app/components/ui/Toast";
import { apiFetch } from "@/lib/apiFetch";
import { formatDate } from "@/lib/utils";
import type { SupportTicket, SupportTicketStatus } from "@/types";

// ── Status badge ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SupportTicketStatus }) {
  const styles: Record<SupportTicketStatus, string> = {
    OPEN: "bg-amber-100 text-amber-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    RESOLVED: "bg-emerald-100 text-emerald-700",
  };
  const icons: Record<SupportTicketStatus, React.ReactNode> = {
    OPEN: <BiTime className="text-sm" />,
    IN_PROGRESS: <BiLoader className="text-sm" />,
    RESOLVED: <BiCheckCircle className="text-sm" />,
  };
  const labels: Record<SupportTicketStatus, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {icons[status]} {labels[status]}
    </span>
  );
}

// ── Ticket detail modal ───────────────────────────────────────────────

function TicketDetailModal({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiMessageAltDetail className="text-violet-500 text-lg" />
            <h2 className="text-base font-bold text-slate-900">Ticket Details</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
            <BiX className="text-lg" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-900 text-base leading-snug">{ticket.subject}</h3>
            <StatusBadge status={ticket.status} />
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {ticket.details}
          </div>

          {ticket.screenshotUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Screenshot</p>
              <img
                src={ticket.screenshotUrl}
                alt="Screenshot"
                className="rounded-xl border border-slate-200 max-h-64 object-contain w-full"
              />
            </div>
          )}

          {ticket.adminNotes && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Admin Notes</p>
              <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">{ticket.adminNotes}</p>
            </div>
          )}

          <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            Submitted {formatDate(ticket.createdAt)} · Last updated {formatDate(ticket.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main CustomerServicePage ──────────────────────────────────────────

export default function CustomerServicePage() {
  const { show: showToast, ToastNode } = useToast();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await apiFetch("/api/support");
      const json = await res.json();
      if (json.success) setTickets(json.data ?? []);
    } catch { /* ignore */ } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be smaller than 5 MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setScreenshotPreview(result);
      setScreenshotDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const clearScreenshot = () => {
    setScreenshotPreview(null);
    setScreenshotDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) {
      showToast("Please fill in subject and details.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          details: details.trim(),
          screenshotUrl: screenshotDataUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast("Support ticket submitted! We'll get back to you soon.", "success");
        setSubject("");
        setDetails("");
        clearScreenshot();
        fetchTickets();
      } else {
        showToast(json.error ?? "Failed to submit ticket.", "error");
      }
    } catch { showToast("Network error. Please try again.", "error"); } finally { setSubmitting(false); }
  };

  return (
    <div className="w-full h-full flex flex-col px-4 py-4 sm:px-8 sm:py-6 lg:px-10 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <BiSupport className="text-violet-600 text-xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Support</h1>
          <p className="text-slate-500 text-sm mt-0.5">Submit a concern or report an issue. Our team will review and respond.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Submit Form ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BiSend className="text-violet-500" /> New Support Request
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="Brief summary of your concern"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{subject.length}/200</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={6}
                  placeholder="Describe the issue or concern in detail. Include steps to reproduce if applicable."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors resize-none"
                />
              </div>

              {/* Screenshot upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Screenshot <span className="text-slate-400 font-normal">(optional)</span>
                </label>

                {screenshotPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={screenshotPreview} alt="Screenshot preview" className="w-full max-h-40 object-cover" />
                    <button
                      type="button"
                      onClick={clearScreenshot}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <BiX className="text-sm" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-violet-300 rounded-xl p-5 flex flex-col items-center gap-2 text-slate-400 hover:text-violet-500 transition-colors"
                  >
                    <BiImage className="text-2xl" />
                    <span className="text-xs font-medium">Click to attach a screenshot</span>
                    <span className="text-[10px]">PNG, JPG, GIF up to 5MB</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !subject.trim() || !details.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <BiSend /> Submit Request
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info tips */}
          <div className="mt-4 bg-violet-50 border border-violet-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-violet-700">Tips for faster support:</p>
            <ul className="text-xs text-violet-600 space-y-1 list-disc list-inside">
              <li>Be specific about what you were doing when the issue occurred</li>
              <li>Include a screenshot if possible — it helps us diagnose faster</li>
              <li>Mention any error messages you see</li>
            </ul>
          </div>
        </div>

        {/* ── Ticket History ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <BiPaperclip className="text-slate-400" /> My Requests
              </h2>
              <button
                type="button"
                onClick={fetchTickets}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
                title="Refresh"
              >
                <BiRefresh />
              </button>
            </div>

            {loadingTickets ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center px-8">
                <BiMessageAltDetail className="text-4xl text-slate-200 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No support requests yet</p>
                <p className="text-slate-400 text-xs mt-1">Submit your first request using the form.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{ticket.subject}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ticket.details}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge status={ticket.status} />
                        <span className="text-[10px] text-slate-400">{formatDate(ticket.createdAt)}</span>
                      </div>
                    </div>
                    {ticket.adminNotes && ticket.status === "RESOLVED" && (
                      <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                        ✅ Admin responded — click to view
                      </div>
                    )}
                    {ticket.screenshotUrl && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                        <BiImage /> Screenshot attached
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {ToastNode}
    </div>
  );
}
