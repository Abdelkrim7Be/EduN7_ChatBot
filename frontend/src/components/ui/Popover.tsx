import { useState } from "react";
import type { ReactNode } from "react";
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  FloatingPortal,
  FloatingFocusManager,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end";
  hover?: boolean;
  className?: string;
}

export function Popover({
  trigger,
  children,
  placement = "bottom-start",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const close = () => setOpen(false);
  const body = typeof children === "function" ? children(close) : children;

  return (
    <>
      <span ref={refs.setReference} {...getReferenceProps()}>
        {trigger}
      </span>
      <AnimatePresence>
        {open && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <motion.div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`z-50 rounded-xl bg-white dark:bg-brand-navy border border-brand-gray dark:border-brand-navy-border shadow-elevated overflow-hidden ${className}`}
              >
                {body}
              </motion.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}
