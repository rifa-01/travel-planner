"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; tone: "ok" | "error" };

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex animate-fade-up items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-lift)]"
          >
            {t.tone === "ok" ? <CheckCircle2 size={16} className="text-emerald-300" /> : <AlertCircle size={16} className="text-red-300" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
