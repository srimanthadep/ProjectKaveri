import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: { type: ToastType; title: string; message?: string; duration?: number }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string | { error?: { code?: string; message?: string } }) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, duration = 4000 }: { type: ToastType; title: string; message?: string; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);

  const error = useCallback(
    (title: string, messageOrEnvelope?: string | { error?: { code?: string; message?: string } }) => {
      let msg = '';
      if (typeof messageOrEnvelope === 'string') {
        msg = messageOrEnvelope;
      } else if (messageOrEnvelope?.error?.message) {
        msg = `[${messageOrEnvelope.error.code || 'ERR'}]: ${messageOrEnvelope.error.message}`;
      }
      toast({ type: 'error', title, message: msg || 'An unexpected error occurred. Please try again.' });
    },
    [toast]
  );

  const info = useCallback((title: string, message?: string) => toast({ type: 'info', title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast container */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-[#E7E3DA] bg-white/95 p-4 shadow-lg backdrop-blur-md"
            >
              <span className="mt-px shrink-0" aria-hidden="true">
                {t.type === 'success' && <CheckCircle2 className="h-4.5 w-4.5 text-[#2F6154]" />}
                {t.type === 'error' && <AlertCircle className="h-4.5 w-4.5 text-[#A8332B]" />}
                {t.type === 'info' && <Info className="h-4.5 w-4.5 text-[#2F6154]" />}
                {t.type === 'warning' && <AlertTriangle className="h-4.5 w-4.5 text-[#B08A1F]" />}
              </span>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold leading-snug tracking-[-0.008em] text-[#1D3E37]">{t.title}</h4>
                {t.message && <p className="mt-0.5 text-xs leading-relaxed text-[#545B56]">{t.message}</p>}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-[#9A958A] transition-colors hover:bg-[#F4F2ED] hover:text-[#1D3E37]"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
