"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  autoDismissMs: number | null;
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: "bg-green-900/90", border: "border-green-500/50", icon: "M5 13l4 4L19 7" },
  error: { bg: "bg-red-900/90", border: "border-red-500/50", icon: "M6 18L18 6M6 6l12 12" },
  warning: { bg: "bg-yellow-900/90", border: "border-yellow-500/50", icon: "M12 9v4m0 4h.01M12 2L2 22h20L12 2z" },
  info: { bg: "bg-blue-900/90", border: "border-blue-500/50", icon: "M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" },
};

const AUTO_DISMISS_MS: Record<ToastVariant, number | null> = {
  success: 3000,
  error: null,
  warning: 5000,
  info: 3000,
};

interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ item, onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const style = VARIANT_STYLES[item.variant];

  useEffect(() => {
    if (item.autoDismissMs !== null) {
      timerRef.current = setTimeout(() => onDismiss(item.id), item.autoDismissMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, item.autoDismissMs, onDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm text-gray-100 ${style.bg} ${style.border}`}
    >
      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
      </svg>
      <span className="flex-1 text-sm">{item.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="p-0.5 text-gray-400 hover:text-gray-200 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

let globalIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((variant: ToastVariant, message: string) => {
    const id = `toast-${++globalIdCounter}-${Date.now()}`;
    const item: ToastItem = { id, message, variant, autoDismissMs: AUTO_DISMISS_MS[variant] };
    setToasts((prev) => [...prev, item]);
    return id;
  }, []);

  const toast = {
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    warning: (message: string) => addToast("warning", message),
    info: (message: string) => addToast("info", message),
  };

  return { toast, toasts, dismiss };
}
