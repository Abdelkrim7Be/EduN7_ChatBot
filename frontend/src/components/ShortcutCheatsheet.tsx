import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const Mod = isMac ? "⌘" : "Ctrl";

const SECTIONS = [
  {
    title: "Palette",
    rows: [
      { keys: [`${Mod}`, "K"], label: "Ouvrir la palette de commandes" },
      { keys: ["?"], label: "Afficher les raccourcis" },
    ],
  },
  {
    title: "Chat",
    rows: [
      { keys: ["/"], label: "Focuser le champ de message" },
      { keys: [`${Mod}`, "N"], label: "Nouvelle conversation" },
      { keys: [`${Mod}`, "E"], label: "Exporter la conversation" },
    ],
  },
  {
    title: "Palette — navigation",
    rows: [
      { keys: ["↑", "↓"], label: "Naviguer dans les résultats" },
      { keys: ["↵"], label: "Exécuter la commande" },
      { keys: ["Esc"], label: "Fermer / annuler" },
    ],
  },
];

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded border border-hairline bg-surface-2 text-[10px] font-semibold text-fg font-sans"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutCheatsheet({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <FloatingPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-sm rounded-2xl border border-hairline bg-surface-1 shadow-elevated overflow-hidden"
              role="dialog"
              aria-modal
              aria-label="Raccourcis clavier"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
                <div>
                  <h2 className="text-sm font-semibold text-fg">
                    Raccourcis clavier
                  </h2>
                  <p className="text-[11px] text-fg-muted mt-0.5">ENSET AI</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-3 transition-colors"
                  aria-label="Fermer"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Shortcut list */}
              <div className="px-5 py-4 space-y-5">
                {SECTIONS.map((section) => (
                  <div key={section.title}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-2">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.rows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between py-1.5"
                        >
                          <span className="text-sm text-fg-secondary">
                            {row.label}
                          </span>
                          <Keys keys={row.keys} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-hairline text-[10px] text-fg-muted text-center">
                Appuyez sur <kbd className="font-mono px-1">Esc</kbd> pour
                fermer
              </div>
            </motion.div>
          </div>
        </FloatingPortal>
      )}
    </AnimatePresence>
  );
}
