import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue>({ push: () => undefined, toasts: [] });

export function useToast() {
  return useContext(ToastContext);
}

let id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = 'info') => {
    const newId = ++id;
    setToasts((t) => [...t, { id: newId, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== newId));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ push, toasts }), [push, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`rounded px-4 py-2 shadow text-white ${
              t.variant === 'error'
                ? 'bg-red-600'
                : t.variant === 'success'
                ? 'bg-green-600'
                : 'bg-gray-800'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
