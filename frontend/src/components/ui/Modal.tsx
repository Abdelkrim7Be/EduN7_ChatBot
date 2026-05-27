import type { ReactNode } from "react";
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  FloatingOverlay,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  title?: string;
  description?: string;
}

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  children,
  size = "md",
  title,
  description,
}: Props) {
  const { refs, context } = useFloating({
    open,
    onOpenChange: (v) => {
      if (!v) onClose();
    },
  });

  useClick(context);
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  return (
    <AnimatePresence>
      {open && (
        <FloatingPortal>
          <FloatingOverlay
            lockScroll
            className="z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden
            />
            <FloatingFocusManager context={context}>
              <motion.div
                ref={refs.setFloating}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                className={`relative w-full ${SIZES[size]} rounded-2xl bg-white dark:bg-brand-navy border border-brand-gray dark:border-brand-navy-border shadow-elevated overflow-hidden`}
                aria-labelledby={title ? "modal-title" : undefined}
                aria-describedby={description ? "modal-description" : undefined}
              >
                {(title || description) && (
                  <div className="px-5 py-4 border-b border-brand-gray dark:border-brand-navy-border">
                    {title && (
                      <h2
                        id="modal-title"
                        className="text-base font-bold text-brand-navy dark:text-white"
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p
                        id="modal-description"
                        className="mt-0.5 text-xs text-brand-gray-text dark:text-white/50"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                )}
                {children}
              </motion.div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      )}
    </AnimatePresence>
  );
}
