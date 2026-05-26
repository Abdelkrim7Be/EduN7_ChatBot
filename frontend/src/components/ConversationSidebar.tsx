import { useState, useRef, useEffect } from "react";
import type { Conversation, DocumentRecord } from "../types";

interface Props {
  // Conversations
  conversations: Conversation[];
  currentSessionId: string;
  onNewConversation: () => void;
  onSwitchConversation: (conv: Conversation) => void;
  onDeleteConversation: (sessionId: string) => void;
  onRenameConversation: (sessionId: string, title: string) => void;
  // Context / Documents
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  onToggleDoc: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onAddMore: () => void;
  // Collapse
  collapsed: boolean;
  onCollapseToggle: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const delta = Date.now() / 1000 - ts;
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

type Group = { label: string; items: Conversation[] };

function groupByRecency(conversations: Conversation[]): Group[] {
  const now = Date.now() / 1000;
  const buckets: Record<string, Conversation[]> = {
    "Today": [],
    "Yesterday": [],
    "Last 7 days": [],
    "Older": [],
  };
  for (const c of conversations) {
    const delta = now - c.last_active;
    if (delta < 86400) buckets["Today"].push(c);
    else if (delta < 172800) buckets["Yesterday"].push(c);
    else if (delta < 604800) buckets["Last 7 days"].push(c);
    else buckets["Older"].push(c);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ── Inline-rename input ───────────────────────────────────────────────────────

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
      className="w-full bg-transparent border-b border-brand-purple text-white text-xs outline-none py-0.5"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ── Conversation item ─────────────────────────────────────────────────────────

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
      onDoubleClick={(e) => { e.preventDefault(); setRenaming(true); }}
      className={`group relative flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? "bg-brand-purple/10 border-l-2 border-brand-purple"
          : "hover:bg-brand-gray/60 border-l-2 border-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        {renaming ? (
          <RenameInput
            initial={conv.title}
            onSave={(v) => { onRename(v); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <p className={`text-xs font-medium truncate leading-snug ${isActive ? "text-white" : "text-gray-200"}`}>
            {conv.title}
          </p>
        )}
        <p className="text-[10px] text-gray-500 mt-0.5 leading-none">
          {relativeTime(conv.last_active)}
          {conv.message_count > 0 && ` · ${conv.message_count} msgs`}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete conversation"
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 text-gray-500 hover:text-red-400 transition-all mt-0.5"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConversationSidebar({
  conversations,
  currentSessionId,
  onNewConversation,
  onSwitchConversation,
  onDeleteConversation,
  onRenameConversation,
  documents,
  selectedDocIds,
  onToggleDoc,
  onDeleteDoc,
  onAddMore,
  collapsed,
  onCollapseToggle,
}: Props) {
  // Collapsed strip
  if (collapsed) {
    return (
      <aside className="w-10 flex-shrink-0 bg-brand-surface border-r border-brand-gray flex flex-col items-center py-3 gap-3">
        <button
          onClick={onCollapseToggle}
          title="Show sidebar"
          className="p-1.5 rounded-lg hover:bg-brand-gray text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {conversations.length > 0 && (
          <span className="text-[10px] font-bold text-gray-600">{conversations.length}</span>
        )}
      </aside>
    );
  }

  const groups = groupByRecency(conversations);

  return (
    <aside className="w-72 flex-shrink-0 bg-brand-surface border-r border-brand-gray flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray flex-shrink-0">
        <span className="text-sm font-semibold text-white">Chats</span>
        <button
          onClick={onCollapseToggle}
          title="Collapse sidebar"
          className="p-1 rounded hover:bg-brand-gray text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* ── New chat button ── */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-brand-purple-light border border-brand-purple/30 hover:bg-brand-purple/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>

      {/* ── Conversations list ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-500 text-center pt-6 px-4">
            No conversations yet. Start a new chat!
          </p>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                {label}
              </p>
              {items.map((conv) => (
                <ConvItem
                  key={conv.session_id}
                  conv={conv}
                  isActive={conv.session_id === currentSessionId}
                  onSelect={() => onSwitchConversation(conv)}
                  onDelete={() => onDeleteConversation(conv.session_id)}
                  onRename={(title) => onRenameConversation(conv.session_id, title)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Context / Documents ── */}
      <div className="border-t border-brand-gray flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Context
          </span>
          <button
            onClick={onAddMore}
            className="text-[10px] text-brand-purple-light hover:text-brand-purple transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto px-2 pb-3 space-y-0.5">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-3">
              No documents — upload a PDF to chat
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.doc_id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-brand-gray/50 group"
              >
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(doc.doc_id)}
                  onChange={() => onToggleDoc(doc.doc_id)}
                  className="mt-0.5 accent-brand-purple cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {doc.page_count}p · {doc.chunk_count} chunks
                  </p>
                </div>
                <button
                  onClick={() => onDeleteDoc(doc.doc_id)}
                  title="Remove"
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
