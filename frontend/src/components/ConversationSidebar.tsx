import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Plus, Trash2, Edit2, LogOut, PanelLeftClose, PanelLeftOpen, Settings, Library, Check, X, Home, Shield } from "lucide-react";
import { ProfileModal } from "./ProfileModal";
import type { Conversation } from "../types";
import { conversationTitle } from "../utils/conversationTitle";

interface Props {
  conversations: Conversation[];
  currentSessionId: string;
  onNewConversation: () => void;
  onSwitchConversation: (conv: Conversation) => void;
  onDeleteConversation: (sessionId: string) => void;
  onRenameConversation: (sessionId: string, title: string) => void;

  collapsed: boolean;
  onCollapseToggle: () => void;
  user?: { name: string; email?: string; role: string; avatar_url?: string } | null;
}

function relativeTime(ts: number): string {
  const delta = Date.now() / 1000 - ts;
  if (delta < 60) return "Just now";
  if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

type Group = { label: string; items: Conversation[] };

function groupByRecency(conversations: Conversation[]): Group[] {
  const now = Date.now() / 1000;
  const buckets: Record<string, Conversation[]> = {
    "Today": [],
    "Yesterday": [],
    "Last 7 Days": [],
    "Older": [],
  };
  for (const c of conversations) {
    const delta = now - c.last_active;
    if (delta < 86400) buckets["Today"].push(c);
    else if (delta < 172800) buckets["Yesterday"].push(c);
    else if (delta < 604800) buckets["Last 7 Days"].push(c);
    else buckets["Older"].push(c);
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
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value);
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 bg-surface-dim text-white text-sm px-2 py-1 rounded outline-none border border-border-subtle"
      />
      <button onClick={() => onSave(value)} className="p-1 hover:text-white text-gray-400">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-1 hover:text-white text-gray-400">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  currentSessionId,
  onNewConversation,
  onSwitchConversation,
  onDeleteConversation,
  onRenameConversation,
  collapsed,
  onCollapseToggle,
  user,
}: Props) {
  const { logout, isRole, hasPermission } = useAuth();
  const navigate = useNavigate();
  const groups = groupByRecency(conversations);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "User";

  if (collapsed) {
    return (
      <div className="w-16 h-full bg-black border-r border-border-subtle flex flex-col items-center py-4 z-20 relative">
        <button
          onClick={onCollapseToggle}
          className="p-2 text-gray-500 hover:text-white rounded-sm hover:bg-surface-dim transition-colors mb-4"
          title="Show conversations"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
        <button
          onClick={onNewConversation}
          className="p-2 text-gray-500 hover:text-white rounded-sm hover:bg-surface-dim transition-colors"
          title="New conversation"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r border-border-subtle flex flex-col h-full bg-black shrink-0 relative z-20 font-mono">
      <div className="p-6 flex items-center justify-between">
        <div className="text-xl font-bold tracking-tighter text-white">ENSET AI</div>
        <button
          onClick={onCollapseToggle}
          className="p-1.5 text-gray-500 hover:text-white rounded-sm hover:bg-surface-dim transition-colors"
          title="Hide conversations"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className="mb-8">
          <button
            onClick={onNewConversation}
            className="w-full text-left py-2 px-3 text-sm text-white border border-white/20 hover:border-white hover:bg-white hover:text-black transition-all duration-300 rounded-sm"
          >
            + NEW SESSION
          </button>
          
          {(isRole("admin") || hasPermission("admin.dashboard.view")) && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20 hover:border-accent/40 transition-all duration-300 rounded-sm uppercase tracking-widest"
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </button>
          )}
        </div>

        {groups.map((g) => (
          <div key={g.label} className="mb-6">
            <div className="text-[10px] text-gray-600 uppercase tracking-widest px-3 mb-2">{g.label}</div>
            <div className="space-y-4">
              {g.items.map((c) => {
                const isActive = c.session_id === currentSessionId;
                const isRenaming = renamingId === c.session_id;
                return (
                  <div
                    key={c.session_id}
                    className={`group cursor-pointer flex items-center justify-between ${
                      isActive ? "text-white" : "text-gray-500 hover:text-white"
                    } transition-colors`}
                    onClick={() => onSwitchConversation(c)}
                  >
                    {isRenaming ? (
                        <div className="px-3 w-full">
                          <RenameInput
                            initial={conversationTitle(c.title)}
                            onSave={(val) => {
                              if (val.trim()) onRenameConversation(c.session_id, val);
                              setRenamingId(null);
                            }}
                            onCancel={() => setRenamingId(null)}
                          />
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0 pr-2">
                            <div className={`px-3 text-sm font-medium truncate ${isActive ? "text-white" : ""}`}>
                                {conversationTitle(c.title)}
                            </div>
                            <div className="px-3 text-[11px] text-gray-600">{relativeTime(c.last_active)}</div>
                        </div>
                      )
                    }

                    {!isRenaming && (
                        <div className="hidden group-hover:flex items-center gap-1 pr-2">
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(c.session_id);
                            }}
                            className="p-1 text-gray-500 hover:text-white"
                            title="Rename"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(c.session_id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border-subtle flex items-center gap-3 relative">
        <div className="w-8 h-8 rounded-sm bg-surface-bright flex items-center justify-center overflow-hidden">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate text-white">{displayName}</div>
        </div>
        <button
          type="button"
          className="text-gray-600 cursor-pointer hover:text-white px-2 py-1"
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Open user menu"
          aria-expanded={showMenu}
        >
          ⁝
        </button>
        {showMenu && (
            <div className="absolute bottom-14 right-4 bg-surface-dim border border-border-subtle rounded-sm py-1 shadow-lg w-48 z-50">
                <div className="px-4 py-2 border-b border-border-subtle flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-surface-bright flex items-center justify-center overflow-hidden">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{displayName}</div>
                    <div className="text-[10px] text-gray-500 capitalize">{user?.role}</div>
                  </div>
                </div>
                
                <button
                    onClick={() => {
                        setShowMenu(false);
                        navigate("/welcome");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-surface-bright flex items-center gap-2"
                >
                    <Home className="w-4 h-4" />
                    Home
                </button>
                
                <button
                    onClick={() => {
                        setShowMenu(false);
                        window.location.href = '/settings';
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-surface-bright flex items-center gap-2"
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
                
                {(isRole("professor", "admin") || hasPermission("library.view")) && (
                  <button
                      onClick={() => {
                          setShowMenu(false);
                          navigate("/library");
                      }}
                      className={`w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-surface-bright flex items-center gap-2 ${isRole("admin") || hasPermission("admin.dashboard.view") ? "" : "border-b border-border-subtle"}`}
                  >
                      <Library className="w-4 h-4" />
                      Library
                  </button>
                )}
                
                {(isRole("admin") || hasPermission("admin.dashboard.view")) && (
                  <button
                      onClick={() => {
                          setShowMenu(false);
                          navigate("/admin/dashboard");
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-surface-bright flex items-center gap-2 border-b border-border-subtle"
                  >
                      <Settings className="w-4 h-4" />
                      Admin Dashboard
                  </button>
                )}

                <button
                    onClick={() => {
                        setShowMenu(false);
                        logout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-bright flex items-center gap-2 mt-1"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        )}
      </div>
      
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </aside>
  );
}
