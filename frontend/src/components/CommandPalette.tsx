import { useEffect, type ReactNode } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import { useNavigate } from "react-router-dom";
import type { Conversation, DocumentRecord } from "../types";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const Mod = isMac ? "⌘" : "Ctrl";

interface Props {
  open: boolean;
  onClose: () => void;
  onNewConversation: () => void;
  onExportConversation: () => void;
  onClearMessages: () => void;
  onToggleTheme: () => void;
  onOpenCheatsheet: () => void;
  conversations: Conversation[];
  currentSessionId: string;
  onSwitchConversation: (conv: Conversation) => void;
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  onToggleDoc: (id: string) => void;
  canAccessLibrary: boolean;
  canAccessAdmin: boolean;
  hasMessages: boolean;
}

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-fg-muted";

function Item({
  value,
  onSelect,
  icon,
  shortcut,
  children,
}: {
  value: string;
  onSelect: () => void;
  icon: ReactNode;
  shortcut?: string;
  children: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm text-fg cursor-pointer aria-selected:bg-surface-2 transition-colors"
    >
      <span className="w-4 h-4 text-fg-muted flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 flex items-center gap-2">{children}</span>
      {shortcut && (
        <span className="text-[11px] text-fg-muted font-mono flex-shrink-0">
          {shortcut}
        </span>
      )}
    </Command.Item>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const IconPlus = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);
const IconDownload = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);
const IconTrash = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);
const IconSun = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);
const IconKeyboard = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 7H7m2 0h2M9 7v2m0-2V5m6 2h-2m2 0h2m-2 0v2m0-2V5M5 11h14M5 15h2m4 0h2m4 0h2M3 7h1m-1 8h1m16-8h1m-1 8h1M3 3h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z"
    />
  </svg>
);
const IconBook = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);
const IconSettings = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);
const IconChat = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);
const IconDoc = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({
  open,
  onClose,
  onNewConversation,
  onExportConversation,
  onClearMessages,
  onToggleTheme,
  onOpenCheatsheet,
  conversations,
  currentSessionId,
  onSwitchConversation,
  documents,
  selectedDocIds,
  onToggleDoc,
  canAccessLibrary,
  canAccessAdmin,
  hasMessages,
}: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function run(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <FloatingPortal>
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-hairline bg-surface-1 shadow-elevated"
              role="dialog"
              aria-modal
              aria-label="Palette de commandes"
            >
              <Command loop>
                {/* Search row */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-hairline">
                  <svg
                    className="w-4 h-4 text-fg-muted flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <Command.Input
                    autoFocus
                    placeholder="Rechercher des commandes…"
                    className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-muted outline-none"
                  />
                  <span className="text-[10px] text-fg-muted border border-hairline rounded px-1.5 py-0.5 font-mono">
                    Esc
                  </span>
                </div>

                {/* Results list */}
                <Command.List className="max-h-[380px] overflow-y-auto py-2">
                  <div className="p-4 text-center text-sm text-gray-500">
                    No results found.
                  </div>

                  {/* Actions */}
                  <Command.Group
                    heading="Actions"
                    className={groupHeadingClass}
                  >
                    <Item
                      value="nouvelle conversation"
                      icon={<IconPlus />}
                      shortcut={`${Mod}+N`}
                      onSelect={() => run(onNewConversation)}
                    >
                      Nouvelle conversation
                    </Item>
                    {hasMessages && (
                      <Item
                        value="export conversation download"
                        icon={<IconDownload />}
                        shortcut={`${Mod}+E`}
                        onSelect={() => run(onExportConversation)}
                      >
                        Exporter la conversation
                      </Item>
                    )}
                    {hasMessages && (
                      <Item
                        value="effacer supprimer conversation"
                        icon={<IconTrash />}
                        onSelect={() => run(onClearMessages)}
                      >
                        Effacer la conversation
                      </Item>
                    )}
                    <Item
                      value="thème mode sombre clair"
                      icon={<IconSun />}
                      onSelect={() => run(onToggleTheme)}
                    >
                      Changer le thème
                    </Item>
                    <Item
                      value="raccourcis clavier aide help"
                      icon={<IconKeyboard />}
                      shortcut="?"
                      onSelect={() => run(onOpenCheatsheet)}
                    >
                      Raccourcis clavier
                    </Item>
                  </Command.Group>

                  {/* Navigation */}
                  {(canAccessLibrary || canAccessAdmin) && (
                    <Command.Group
                      heading="Navigation"
                      className={groupHeadingClass}
                    >
                      {canAccessLibrary && (
                        <Item
                          value="library shared documents"
                          icon={<IconBook />}
                          onSelect={() => run(() => navigate("/library"))}
                        >
                          Bibliothèque
                        </Item>
                      )}
                      {canAccessAdmin && (
                        <Item
                          value="administration panneau admin"
                          icon={<IconSettings />}
                          onSelect={() =>
                            run(() => navigate("/admin/dashboard"))
                          }
                        >
                          Administration
                        </Item>
                      )}
                    </Command.Group>
                  )}

                  {/* Conversations */}
                  {conversations.length > 0 && (
                    <Command.Group
                      heading="Recent Conversations"
                      className={groupHeadingClass}
                    >
                      {conversations.slice(0, 6).map((conv) => (
                        <Item
                          key={conv.session_id}
                          value={conv.title ?? conv.session_id}
                          icon={<IconChat />}
                          onSelect={() => run(() => onSwitchConversation(conv))}
                        >
                          <span className="truncate flex-1">
                            {conv.title || "Conversation sans titre"}
                          </span>
                          {conv.session_id === currentSessionId && (
                            <span className="text-[10px] text-accent font-medium flex-shrink-0">
                              active
                            </span>
                          )}
                        </Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Documents */}
                  {documents.length > 0 && (
                    <Command.Group
                      heading="Documents"
                      className={groupHeadingClass}
                    >
                      {documents.map((doc) => (
                        <Item
                          key={doc.doc_id}
                          value={doc.name}
                          icon={<IconDoc />}
                          onSelect={() => run(() => onToggleDoc(doc.doc_id))}
                        >
                          <span className="truncate flex-1">{doc.name}</span>
                          {selectedDocIds.has(doc.doc_id) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                          )}
                        </Item>
                      ))}
                    </Command.Group>
                  )}
                </Command.List>

                {/* Footer hint */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-hairline text-[10px] text-fg-muted">
                  <span>
                    <kbd className="font-mono">↑↓</kbd> Naviguer
                  </span>
                  <span>
                    <kbd className="font-mono">↵</kbd> Select
                  </span>
                  <span>
                    <kbd className="font-mono">Esc</kbd> Fermer
                  </span>
                </div>
              </Command>
            </motion.div>
          </div>
        </FloatingPortal>
      )}
    </AnimatePresence>
  );
}
