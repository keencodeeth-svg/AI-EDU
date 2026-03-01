"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastDetail = {
  message: string;
  tone?: ToastTone;
};

const TOAST_EVENT = "app:toast";

export function pushAppToast(message: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, {
      detail: { message, tone }
    })
  );
}

export default function AppToastHub() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (event: Event) => {
      const custom = event as CustomEvent<ToastDetail>;
      const detail = custom.detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.floor(Math.random() * 10000);
      const next: ToastItem = {
        id,
        message: detail.message,
        tone: detail.tone ?? "success"
      };
      setToasts((prev) => [...prev, next]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 1800);
    };

    window.addEventListener(TOAST_EVENT, listener as EventListener);
    return () => {
      window.removeEventListener(TOAST_EVENT, listener as EventListener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`app-toast ${toast.tone === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

