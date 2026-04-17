'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastRecord {
  description?: string;
  durationMs: number;
  id: string;
  title: string;
  variant: ToastVariant;
}

interface ToastOptions {
  description?: string;
  durationMs?: number;
  title: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  dismissToast: (id: string) => void;
  showToast: (options: ToastOptions) => string;
}

const DEFAULT_DURATION_MS = 4200;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextToast: ToastRecord = {
        description: options.description,
        durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
        id,
        title: options.title,
        variant: options.variant ?? 'info',
      };

      setToasts((currentToasts) => [...currentToasts, nextToast]);

      window.setTimeout(() => {
        dismissToast(id);
      }, nextToast.durationMs);

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      dismissToast,
      showToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(92vw,22rem)] flex-col gap-3"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  onDismiss: () => void;
  toast: ToastRecord;
}) {
  const toneClasses = {
    error:
      'border-red-500/30 bg-red-500/10 text-red-100 shadow-red-950/20',
    info:
      'border-ai-blue-500/30 bg-ai-blue-500/10 text-cream shadow-sky-950/20',
    success:
      'border-mastery-500/30 bg-mastery-500/10 text-cream shadow-emerald-950/20',
    warning:
      'border-amber-500/30 bg-amber-500/10 text-cream shadow-amber-950/20',
  } as const;

  const iconMap = {
    error: <AlertCircle size={18} className="text-red-300" />,
    info: <Info size={18} className="text-ai-blue-300" />,
    success: <CheckCircle2 size={18} className="text-mastery-300" />,
    warning: <TriangleAlert size={18} className="text-amber-300" />,
  } as const;

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md animate-fade-up',
        toneClasses[toast.variant],
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{iconMap[toast.variant]}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm text-cream-muted">{toast.description}</p>
          )}
        </div>
        <button
          className="rounded-md p-1 text-cream-muted transition-colors hover:bg-black/10 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)]"
          onClick={onDismiss}
          type="button"
        >
          <span className="sr-only">Dismiss notification</span>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
