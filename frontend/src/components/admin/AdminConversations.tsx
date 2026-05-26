import { useEffect, useRef, useState } from "react";
import type {
  AdminConversation,
  AdminConversationMessage,
} from "../../api/client";
import {
  deleteAdminConversation,
  fetchAdminConversationMessages,
  fetchAdminConversations,
} from "../../api/client";
import { useToast } from "../ToastProvider";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() / 1000 - ts) / 60);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `il y a ${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-xs flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MessageBubble({ msg }: { msg: AdminConversationMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-brand-navy flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-brand-blue text-white rounded-tr-sm"
            : "bg-white border border-brand-gray text-brand-navy rounded-tl-sm"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

function ConversationDrawer({
  sessionId,
  onClose,
  onDeleted,
}: {
  sessionId: string;
  onClose: () => void;
  title: string;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<AdminConversationMessage[]>([]);
  const [convTitle, setConvTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAdminConversationMessages(sessionId)
      .then((d) => {
        setConvTitle(d.conversation.title);
        setMessages(d.messages);
      })
      .catch(() => toast("Erreur chargement messages", "error"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAdminConversation(sessionId);
      toast("Conversation supprimée", "success");
      onDeleted();
      onClose();
    } catch {
      toast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-brand-surface-muted flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-brand-gray flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-navy truncate">
              {convTitle}
            </p>
            <p className="text-xs text-brand-gray-text">
              {messages.length} messages
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {deleting ? "..." : "Confirmer"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-brand-gray-text hover:text-brand-navy"
                >
                  Annuler
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Supprimer cette conversation"
                className="p-1.5 text-brand-gray-mid hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-brand-gray-mid hover:text-brand-navy hover:bg-brand-surface-muted rounded-lg transition-colors"
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
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-brand-gray-text py-12">
              Aucun message.
            </p>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

export function AdminConversations() {
  const { toast } = useToast();
  const [convs, setConvs] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState<AdminConversation | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchAdminConversations(debouncedSearch || undefined)
      .then(setConvs)
      .catch(() => toast("Erreur chargement conversations", "error"))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Conversations</h1>
        <p className="text-sm text-brand-gray-text mt-0.5">
          Supervision et modération de toutes les conversations utilisateurs
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-mid"
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
          placeholder="Rechercher par utilisateur ou titre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-brand-gray rounded-xl pl-9 pr-3 py-2.5 text-sm text-brand-navy placeholder-brand-gray-text focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : convs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-medium text-brand-navy">
            Aucune conversation
          </p>
          <p className="text-xs text-brand-gray-text mt-1">
            {search
              ? "Aucun résultat pour cette recherche."
              : "Aucune conversation enregistrée."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-gray shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-brand-gray bg-brand-surface-muted">
            <p className="text-xs text-brand-gray-text font-medium">
              {convs.length} conversation{convs.length !== 1 ? "s" : ""}
              {search && ` · filtrées sur "${search}"`}
            </p>
          </div>
          <ul className="divide-y divide-brand-gray">
            {convs.map((conv) => (
              <li
                key={conv.session_id}
                onClick={() => setOpen(conv)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-brand-surface-muted cursor-pointer transition-colors group"
              >
                <Avatar name={conv.user_name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-navy truncate group-hover:text-brand-blue transition-colors">
                      {conv.title}
                    </p>
                    <span className="text-[11px] text-brand-gray-mid flex-shrink-0">
                      {timeAgo(conv.last_active)}
                    </span>
                  </div>
                  <p className="text-xs text-brand-gray-text mt-0.5">
                    {conv.user_name}
                    {conv.user_email && (
                      <span className="text-brand-gray-mid">
                        {" "}
                        · {conv.user_email}
                      </span>
                    )}
                  </p>
                  {conv.last_message && (
                    <p className="text-xs text-brand-gray-mid mt-1 truncate italic">
                      {conv.last_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-xs text-brand-gray-mid">
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {conv.message_count}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <ConversationDrawer
          sessionId={open.session_id}
          title={open.title}
          onClose={() => setOpen(null)}
          onDeleted={() =>
            setConvs((prev) =>
              prev.filter((c) => c.session_id !== open.session_id),
            )
          }
        />
      )}
    </div>
  );
}
