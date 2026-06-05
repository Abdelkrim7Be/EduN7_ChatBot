import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded border border-hairline bg-surface-2 text-[10px] font-semibold text-fg font-sans shadow-soft">
      {children}
    </kbd>
  );
}
