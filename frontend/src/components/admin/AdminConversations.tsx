import { useEffect, useRef, useState } from "react";
import { Search, Trash2, X, MessageSquare } from "lucide-react";
import type { AdminConversation, AdminConversationMessage } from "../../api/client";
import { deleteAdminConversation, fetchAdminConversationMessages, fetchAdminConversations } from "../../api/client";
import { useToast } from "../ToastProvider";

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
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-accent-contrast font-bold text-xs flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MessageBubble({ msg }: { msg: AdminConversationMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
        isUser
          ? "bg-accent text-accent-contrast rounded-tr-sm"
          : "bg-surface-2 border border-hairline text-fg rounded-tl-sm"
      }`}>
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
      .then((d) => { setConvTitle(d.conversation.title); setMessages(d.messages); })
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
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-canvas flex flex-col shadow-elevated border-l border-hairline">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-surface-1/80 backdrop-blur-xl border-b border-hairline flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg truncate">{convTitle}</p>
            <p className="text-xs text-fg-muted">{messages.length} messages</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-semibold text-danger hover:text-danger/80 disabled:opacity-50"
                >
                  {deleting ? "..." : "Confirmer"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-fg-secondary hover:text-fg">
                  Annuler
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Supprimer cette conversation"
                className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-3 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-fg-muted py-12">Aucun message.</p>
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
        <h1 className="text-xl font-bold text-fg">Conversations</h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Supervision et modération de toutes les conversations utilisateurs
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          type="text"
          placeholder="Rechercher par utilisateur ou titre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-hairline bg-surface-1 rounded-xl pl-9 pr-3 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : convs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="w-10 h-10 text-surface-3 mb-3" />
          <p className="text-sm font-medium text-fg">Aucune conversation</p>
          <p className="text-xs text-fg-muted mt-1">
            {search ? "Aucun résultat pour cette recherche." : "Aucune conversation enregistrée."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-1 rounded-2xl border border-hairline shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-hairline bg-surface-2/40">
            <p className="text-xs text-fg-muted font-medium">
              {convs.length} conversation{convs.length !== 1 ? "s" : ""}
              {search && ` · filtrées sur "${search}"`}
            </p>
          </div>
          <ul className="divide-y divide-hairline">
            {convs.map((conv) => (
              <li
                key={conv.session_id}
                onClick={() => setOpen(conv)}
                className="flex items-start gap-3 px-5 py-4 hover:bg-surface-2/40 cursor-pointer transition-colors group"
              >
                <Avatar name={conv.user_name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-fg truncate group-hover:text-accent transition-colors">
                      {conv.title}
                    </p>
                    <span className="text-[11px] text-fg-muted flex-shrink-0">{timeAgo(conv.last_active)}</span>
                  </div>
                  <p className="text-xs text-fg-secondary mt-0.5">
                    {conv.user_name}
                    {conv.user_email && <span className="text-fg-muted"> · {conv.user_email}</span>}
                  </p>
                  {conv.last_message && (
                    <p className="text-xs text-fg-muted mt-1 truncate italic">{conv.last_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-xs text-fg-muted">
                  <MessageSquare className="w-3.5 h-3.5" />
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
          onDeleted={() => setConvs((prev) => prev.filter((c) => c.session_id !== open.session_id))}
        />
      )}
    </div>
  );
}
