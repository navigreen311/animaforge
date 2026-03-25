"use client";

import { Toast, type ToastItem } from "./Toast";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <Toast item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
