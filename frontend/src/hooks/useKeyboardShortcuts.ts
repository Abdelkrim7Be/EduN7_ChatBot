import { useEffect, useRef } from "react";

export interface Shortcut {
  key: string;
  mod?: boolean;
  shift?: boolean;
  description: string;
  handler: () => void;
  allowInInput?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const s of ref.current) {
        if (e.key !== s.key) continue;
        if (s.mod !== undefined && s.mod !== (e.ctrlKey || e.metaKey)) continue;
        if (s.shift !== undefined && s.shift !== e.shiftKey) continue;
        if (isEditing && !s.allowInInput) continue;
        e.preventDefault();
        s.handler();
        return;
      }
    }

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
}
