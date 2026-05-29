import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastType = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
  duration: number;
}

interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType, opts?: ToastOptions) => void;
  undo: (message: string, onUndo: () => void) => void;
  dismiss: (id?: number) => void;
}

const ToastContext = createContext<ToastCtx>({
  toast: () => {},
  undo: () => {},
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, ReactNode> = {
  success: (
    <svg
      className="w-4 h-4 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  error: (
    <svg
      className="w-4 h-4 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
        d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-4 h-4 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

const ACCENT: Record<ToastType, string> = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-brand-blue-light",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id?: number) => {
    if (id == null) {
      setToasts([]);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      return;
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", opts: ToastOptions = {}) => {
      const id = ++idRef.current;
      const duration = opts.duration ?? (opts.action ? 6000 : 4000);
      setToasts((prev) => [
        ...prev,
        { id, type, message, action: opts.action, duration },
      ]);
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const undo = useCallback(
    (message: string, onUndo: () => void) => {
      toast(message, "info", {
        action: { label: "Annuler", onClick: onUndo },
        duration: 6000,
      });
    },
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, undo, dismiss }}>
      {children}
      <div
        className="fixed bottom-5 right-5 flex flex-col gap-2 z-[60] pointer-events-none w-full max-w-sm"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 30,
                mass: 0.6,
              }}
              role={t.type === "error" ? "alert" : "status"}
              aria-live={t.type === "error" ? "assertive" : "polite"}
              className="flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-xl border bg-brand-navy border-brand-navy-border shadow-elevated text-sm font-medium pointer-events-auto"
            >
              <span className={ACCENT[t.type]}>{ICONS[t.type]}</span>
              <span className="flex-1 text-white/90">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="text-xs font-semibold text-brand-gold hover:text-brand-gold-dark px-2 py-1 rounded transition-colors"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Fermer la notification"
                className="p-1 rounded text-white/40 hover:text-white/80 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
