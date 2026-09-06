import { useState } from "react";
import type { ReactNode } from "react";
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  arrow,
  FloatingPortal,
  FloatingArrow,
} from "@floating-ui/react";
import { useRef } from "react";

interface Props {
  label: string;
  children: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({
  label,
  children,
  placement = "top",
  delay = 250,
}: Props) {
  const [open, setOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [
      offset(6),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  const hover = useHover(context, { restMs: delay, move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className="inline-flex"
      >
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 px-2 py-1 rounded-md bg-brand-navy text-white text-[11px] font-medium shadow-elevated pointer-events-none"
          >
            {label}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-brand-navy"
              width={8}
              height={4}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
