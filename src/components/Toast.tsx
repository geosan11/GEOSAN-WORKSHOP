import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]); // Max 3 toasts at once
  }, []);

  const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const error = useCallback((msg: string) => addToast('error', msg), [addToast]);
  const info = useCallback((msg: string) => addToast('info', msg), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, dismiss }}>
      {children}
      <div
        className="fixed z-50 pointer-events-none flex flex-col gap-2 p-4 bottom-16 md:bottom-6 left-0 right-0 md:left-auto md:right-6 md:w-96 items-center md:items-end"
        role="region"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000); // Auto-dismiss after 4 seconds
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const borderColors = {
    success: 'border-emerald-500/50 bg-[#161b22]/95 text-emerald-300',
    error: 'border-red-500/50 bg-[#161b22]/95 text-red-300',
    info: 'border-cyan-500/50 bg-[#161b22]/95 text-cyan-300'
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-cyan-400 shrink-0" />
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 w-full max-w-sm px-4 py-3 rounded-lg border shadow-xl backdrop-blur-md text-xs font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${borderColors[toast.type]}`}
      role="alert"
    >
      <div className="flex items-center gap-2.5">
        {icons[toast.type]}
        <span className="text-[#e6edf3]">{toast.message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="text-[#8b98a8] hover:text-[#e6edf3] p-1 rounded transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
