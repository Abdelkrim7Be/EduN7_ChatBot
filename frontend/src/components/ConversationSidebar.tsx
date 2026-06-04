import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation, DocumentRecord } from "../types";

interface Props {
  conversations: Conversation[];
  currentSessionId: string;
  onNewConversation: () => void;
  onSwitchConversation: (conv: Conversation) => void;
  onDeleteConversation: (sessionId: string) => void;
  onRenameConversation: (sessionId: string, title: string) => void;
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  citedDocIds: Set<string>;
  onToggleDoc: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onAddMore: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}

function relativeTime(ts: number): string {
  const delta = Date.now() / 1000 - ts;
  if (delta < 60) return "à l'instant";
  if (delta < 3600) return `${Math.floor(delta / 60)}min`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  return `${Math.floor(delta / 86400)}j`;
}

const CATEGORY_ORDER = [
  "Cours",
  "TD / TP",
  "Examens",
  "Projets",
  "Corrections",
  "Autres",
];

const CATEGORY_STYLE: Record<string, { color: string; icon: ReactNode }> = {
  Cours: {
    color: "text-accent",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  "TD / TP": {
    color: "text-teal-500",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  Examens: {
    color: "text-gold",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
  },
  Projets: {
    color: "text-purple-500",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
  },
  Corrections: {
    color: "text-green-500",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
  },
  Autres: {
    color: "text-fg-muted",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
};

function groupByCategory(
  docs: DocumentRecord[],
): { category: string; docs: DocumentRecord[] }[] {
  const map = new Map<string, DocumentRecord[]>();
  for (const doc of docs) {
    const cat = doc.category ?? "Autres";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(doc);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
    category: c,
    docs: map.get(c)!,
  }));
}

type Group = { label: string; items: Conversation[] };

function groupByRecency(conversations: Conversation[]): Group[] {
  const now = Date.now() / 1000;
  const buckets: Record<string, Conversation[]> = {
    "Aujourd'hui": [],
    Hier: [],
    "7 derniers jours": [],
    "Plus ancien": [],
  };
  for (const c of conversations) {
    const delta = now - c.last_active;
    if (delta < 86400) buckets["Aujourd'hui"].push(c);
    else if (delta < 172800) buckets["Hier"].push(c);
    else if (delta < 604800) buckets["7 derniers jours"].push(c);
    else buckets["Plus ancien"].push(c);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function RenameInput({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => (value.trim() ? onSave(value.trim()) : onCancel())}
      onKeyDown={(e) => {
        if (e.key === "Enter") value.trim() ? onSave(value.trim()) : onCancel();
        if (e.key === "Escape") onCancel();
      }}
      className="w-full bg-transparent border-b border-accent text-fg text-xs outline-none py-0.5"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function ConvItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        setRenaming(true);
      }}
      className={`group relative flex items-start gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-accent before:transition-opacity ${
        isActive
          ? "bg-accent-soft ring-1 ring-accent/30 before:opacity-100 before:shadow-glow"
          : "hover:bg-surface-3 before:opacity-0"
      }`}
    >
      <div className="flex-1 min-w-0">
        {renaming ? (
          <RenameInput
            initial={conv.title}
            onSave={(v) => {
              onRename(v);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <p
            className={`text-xs font-medium truncate leading-snug ${
              isActive
                ? "text-fg"
                : "text-fg-secondary"
            }`}
          >
            {conv.title}
          </p>
        )}
        <p className="text-[10px] text-fg-muted mt-0.5 leading-none">
          {relativeTime(conv.last_active)}
          {conv.message_count > 0 && ` · ${conv.message_count} msgs`}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Supprimer"
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 text-fg-muted hover:text-danger transition-all mt-0.5"
      >
        <svg
          className="w-3 h-3"
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
  );
}

function DocStatusIcon({ status }: { status?: string }) {
  if (!status || status === "ready") return null;
  if (status === "failed") {
    return (
      <span
        title="Échec du traitement"
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-danger"
      />
    );
  }
  return (
    <span
      title="Traitement en cours…"
      className="flex-shrink-0 w-3 h-3 border-[1.5px] border-accent border-t-transparent rounded-full animate-spin"
    />
  );
}

export function ConversationSidebar({
  conversations,
  currentSessionId,
  onNewConversation,
  onSwitchConversation,
  onDeleteConversation,
  onRenameConversation,
  documents,
  selectedDocIds,
  citedDocIds,
  onToggleDoc,
  onDeleteDoc,
  onAddMore,
  collapsed,
  onCollapseToggle,
}: Props) {
  const [search, setSearch] = useState("");
  const filteredConversations = search.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  if (collapsed) {
    return (
      <aside className="w-10 h-full flex-shrink-0 bg-surface-1 border-r border-hairline flex flex-col items-center py-3 gap-3">
        <button
          onClick={onCollapseToggle}
          title="Afficher le panneau"
          className="p-1.5 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg transition-colors"
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        {conversations.length > 0 && (
          <span className="text-[10px] font-bold text-fg-muted">
            {conversations.length}
          </span>
        )}
      </aside>
    );
  }

  const groups = groupByRecency(filteredConversations);

  return (
    <aside className="w-72 h-full flex-shrink-0 bg-surface-1 border-r border-hairline flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline flex-shrink-0">
        <span className="text-sm font-semibold text-fg">
          Conversations
        </span>
        <button
          onClick={onCollapseToggle}
          title="Réduire le panneau"
          className="p-1 rounded hover:bg-surface-3 text-fg-muted hover:text-fg transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2 flex-shrink-0">
        <div className="relative">
          <svg
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
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
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-2 border border-hairline text-fg text-xs placeholder-fg-muted rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 pt-2 pb-2 flex-shrink-0">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-accent-contrast bg-accent hover:bg-accent-hover transition-colors shadow-glow"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nouvelle conversation
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-fg-muted text-center pt-6 px-4">
            Aucune conversation. Démarrez un nouveau chat !
          </p>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                {label}
              </p>
              {items.map((conv, idx) => (
                <motion.div
                  key={conv.session_id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.18,
                    delay: idx * 0.04,
                    ease: "easeOut",
                  }}
                >
                  <ConvItem
                    conv={conv}
                    isActive={conv.session_id === currentSessionId}
                    onSelect={() => onSwitchConversation(conv)}
                    onDelete={() => onDeleteConversation(conv.session_id)}
                    onRename={(title) =>
                      onRenameConversation(conv.session_id, title)
                    }
                  />
                </motion.div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Context / Documents */}
      <div className="border-t border-hairline flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-secondary flex-1">
            Documents
          </span>
          {(() => {
            const allReadyDocs = documents.filter(
              (d) => !d.status || d.status === "ready",
            );
            const allSelected =
              allReadyDocs.length > 0 &&
              allReadyDocs.every((d) => selectedDocIds.has(d.doc_id));
            if (allReadyDocs.length === 0) return null;
            return (
              <button
                onClick={() =>
                  allReadyDocs.forEach((d) => {
                    if (
                      allSelected
                        ? selectedDocIds.has(d.doc_id)
                        : !selectedDocIds.has(d.doc_id)
                    )
                      onToggleDoc(d.doc_id);
                  })
                }
                title={
                  allSelected ? "Tout désélectionner" : "Tout sélectionner"
                }
                className="text-[10px] text-fg-muted hover:text-accent transition-colors font-medium"
              >
                {allSelected ? "Aucun" : "Tous"}
              </button>
            );
          })()}
          <button
            onClick={onAddMore}
            className="text-[10px] text-accent hover:text-accent-hover transition-colors flex items-center gap-1 font-medium"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Ajouter
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto px-2 pb-3 space-y-2">
          {documents.length === 0 ? (
            <p className="text-xs text-fg-muted text-center py-3">
              Aucun document — importez un PDF
            </p>
          ) : (
            groupByCategory(documents).map(({ category, docs }) => {
              const style =
                CATEGORY_STYLE[category] ?? CATEGORY_STYLE["Autres"];
              const readyDocs = docs.filter(
                (d) => !d.status || d.status === "ready",
              );
              const allSelected = readyDocs.every((d) =>
                selectedDocIds.has(d.doc_id),
              );
              const someSelected = readyDocs.some((d) =>
                selectedDocIds.has(d.doc_id),
              );
              return (
                <div key={category}>
                  {/* Category header */}
                  <button
                    onClick={() =>
                      readyDocs.forEach((d) => {
                        if (
                          allSelected
                            ? selectedDocIds.has(d.doc_id)
                            : !selectedDocIds.has(d.doc_id)
                        )
                          onToggleDoc(d.doc_id);
                      })
                    }
                    className="w-full flex items-center gap-1.5 px-1 py-1 rounded hover:bg-surface-3 transition-colors group/cat"
                    title={
                      allSelected ? "Tout désélectionner" : "Tout sélectionner"
                    }
                  >
                    <span className={style.color}>{style.icon}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${style.color}`}
                    >
                      {category}
                    </span>
                    <span className="text-[10px] text-fg-muted ml-auto">
                      {someSelected
                        ? `${readyDocs.filter((d) => selectedDocIds.has(d.doc_id)).length}/${docs.length}`
                        : docs.length}
                    </span>
                    <span className="text-[10px] text-fg-muted opacity-0 group-hover/cat:opacity-100 transition-opacity">
                      {allSelected ? "−" : "+"}
                    </span>
                  </button>

                  {/* Docs in category */}
                  <div className="space-y-0.5 pl-1">
                    {docs.map((doc) => {
                      const isReady = !doc.status || doc.status === "ready";
                      return (
                        <div
                          key={doc.doc_id}
                          className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-surface-3 group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDocIds.has(doc.doc_id)}
                            onChange={() => isReady && onToggleDoc(doc.doc_id)}
                            disabled={!isReady}
                            className="mt-0.5 accent-accent cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <p
                                className="text-xs text-fg-secondary font-medium truncate"
                                title={doc.name}
                              >
                                {doc.name}
                              </p>
                              <DocStatusIcon status={doc.status} />
                              {doc.scope === "shared" && (
                                <span className="flex-shrink-0 text-[9px] font-semibold px-1 py-0 rounded bg-gold/15 text-gold border border-gold/30 leading-4">
                                  Partagé
                                </span>
                              )}
                              {citedDocIds.has(doc.doc_id) && (
                                <span
                                  title="Cité dans cette conversation"
                                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent shadow-glow animate-pulse"
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-fg-muted">
                              {isReady
                                ? `${doc.page_count}p · ${doc.chunk_count} segments`
                                : doc.status === "failed"
                                  ? "Échec"
                                  : "Traitement..."}
                            </p>
                          </div>
                          {isReady && (
                            <button
                              onClick={() => onDeleteDoc(doc.doc_id)}
                              title="Supprimer"
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-fg-muted hover:text-danger transition-all flex-shrink-0 mt-0.5"
                            >
                              <svg
                                className="w-3 h-3"
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom collapse button */}
      <div className="border-t border-hairline flex-shrink-0 px-3 py-2 flex justify-end">
        <button
          onClick={onCollapseToggle}
          title="Réduire le panneau"
          className="flex items-center gap-1.5 text-[10px] text-fg-muted hover:text-fg transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Réduire
        </button>
      </div>
    </aside>
  );
}
