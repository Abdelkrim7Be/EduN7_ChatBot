import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded border border-brand-gray dark:border-brand-navy-border bg-white dark:bg-brand-navy-light text-[10px] font-semibold text-brand-navy dark:text-white/80 font-sans shadow-soft">
      {children}
    </kbd>
  );
}
