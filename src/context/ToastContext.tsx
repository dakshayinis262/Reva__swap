import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 bg-white shadow-lg text-sm transition-all ${
              toast.kind === 'success'
                ? 'border-[#14B8A6]/40 text-slate-900'
                : toast.kind === 'error'
                ? 'border-red-300 text-red-950'
                : 'border-slate-200 text-slate-900'
            }`}
          >
            {toast.kind === 'success' && (
              <CheckCircle2 className="h-4 w-4 text-[#14B8A6] shrink-0 mt-0.5" />
            )}
            {toast.kind === 'error' && (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            )}
            {toast.kind === 'info' && (
              <Info className="h-4 w-4 text-[#6D5CE7] shrink-0 mt-0.5" />
            )}
            <p className="flex-1 leading-snug font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
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
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
