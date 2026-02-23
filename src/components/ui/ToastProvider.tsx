"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  notify: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

function toastTone(variant: ToastVariant) {
  if (variant === "success") {
    return {
      Icon: CheckCircle2,
      className: "border-emerald-300/35 bg-emerald-500/10 text-emerald-100",
    };
  }

  if (variant === "error") {
    return {
      Icon: AlertTriangle,
      className: "border-red-300/35 bg-red-500/10 text-red-100",
    };
  }

  return {
    Icon: Info,
    className: "border-amber-300/35 bg-amber-500/10 text-zinc-100",
  };
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ message, variant = "info", durationMs = 2600 }: ToastInput) => {
      const id = getToastId();
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => removeToast(id), durationMs);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((toast) => {
          const tone = toastTone(toast.variant);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-lg border px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md ${tone.className}`}
            >
              <div className="flex items-start gap-2">
                <tone.Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 text-sm">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded p-0.5 text-zinc-300/80 transition hover:bg-zinc-100/10 hover:text-zinc-100"
                  aria-label="Close notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
