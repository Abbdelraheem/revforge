"use client";

import * as React from "react";
import { cn } from "./button";
import { X } from "lucide-react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastProps[];
  toast: (props: Omit<ToastProps, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((props: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto relative mb-2 flex w-full items-start justify-between space-x-3 overflow-hidden rounded-md border p-4 shadow-lg transition-all",
              t.variant === "destructive"
                ? "border-destructive bg-destructive text-destructive-foreground"
                : t.variant === "success"
                ? "border-emerald-600/40 bg-background text-foreground"
                : "border-border bg-background text-foreground"
            )}
          >
            <div className="grid gap-1 flex-1">
              {t.title && <div className="text-sm font-semibold">{t.title}</div>}
              {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
              {t.action && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="inline-flex items-center rounded border border-primary/40 bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    {t.action.label}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
      dismiss: () => {},
      toasts: [],
    };
  }
  return ctx;
}
