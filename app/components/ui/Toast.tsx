"use client";

import { useEffect, useState } from "react";
import { BiCheck, BiX, BiInfoCircle, BiErrorCircle } from "react-icons/bi";
import { cn } from "@/lib/cn";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  /** Auto-dismiss after this many ms (0 = no auto-dismiss). Default: 3500 */
  duration?: number;
  onDismiss?: () => void;
}

const CONFIG: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: { bg: "bg-emerald-600 text-white", icon: <BiCheck className="text-base shrink-0" /> },
  error:   { bg: "bg-red-600 text-white",     icon: <BiX   className="text-base shrink-0" /> },
  info:    { bg: "bg-violet-600 text-white",  icon: <BiInfoCircle  className="text-base shrink-0" /> },
  warning: { bg: "bg-amber-500 text-white",   icon: <BiErrorCircle className="text-base shrink-0" /> },
};

export function Toast({ message, type = "success", duration = 3500, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const cfg = CONFIG[type];

  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed bottom-6 right-4 sm:right-6 z-[200] flex items-center gap-2",
        "px-4 py-3 rounded-xl shadow-lg text-sm font-medium",
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
        cfg.bg
      )}
    >
      {cfg.icon}
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => { setVisible(false); onDismiss?.(); }}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
      >
        <BiX />
      </button>
    </div>
  );
}

// ─── useToast hook ─────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type: ToastType;
  key: number;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = (message: string, type: ToastType = "success") => {
    setToast({ message, type, key: Date.now() });
  };

  const dismiss = () => setToast(null);

  const ToastNode = toast ? (
    <Toast key={toast.key} message={toast.message} type={toast.type} onDismiss={dismiss} />
  ) : null;

  return { show, ToastNode };
}
