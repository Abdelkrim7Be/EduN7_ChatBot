import { useRef, useMemo, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { useDocuments } from "./hooks/useDocuments";
import { useChat } from "./hooks/useChat";
import { useProviders } from "./hooks/useProviders";
import { useConversations } from "./hooks/useConversations";
import { useAuth } from "./hooks/useAuth";
import { UploadOverlay } from "./components/UploadOverlay";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { MessageInput } from "./components/MessageInput";
import { ModelSelector } from "./components/ModelSelector";
import { LoginPage } from "./components/LoginPage";
import { ToastProvider } from "./components/ToastProvider";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminUsers } from "./components/admin/AdminUsers";
import { AdminDocuments } from "./components/admin/AdminDocuments";
import { AdminConversations } from "./components/admin/AdminConversations";
import { AdminSettings } from "./components/admin/AdminSettings";
import { LibraryPage } from "./components/LibraryPage";
import {
  createSession,
  updateConversationTitle,
  deleteConversationApi,
} from "./api/client";
import type { Conversation, Provider, SelectedModel } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: { name: string; role: string } | null;
  isAuthenticated: boolean;
  loading: boolean;
  isRole: (...roles: ("student" | "professor" | "admin")[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

interface ProviderState {
  providers: Provider[];
  selected: SelectedModel | null;
  loading: boolean;
  select: (provider: string, model: string) => void;
}

// ─── Chat area ───────────────────────────────────────────────────────────────

function ChatArea({
  auth,
  providerState,
}: {
  auth: AuthState;
  providerState: ProviderState;
}) {
  const {
    sessionId,
    loading: sessionLoading,
    switchSession,
  } = useSession(auth.isAuthenticated);
  const {
    documents,
    isUploading,
    uploadError,
    uploadStage,
    selectedDocIds,
    upload,
    remove,
    toggleSelection,
    setSelection,
  } = useDocuments(sessionId);
  const { messages, isStreaming, sendMessage, clearMessages } =
    useChat(sessionId);
  const { conversations, refresh: refreshConvos } = useConversations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { selected } = providerState;
  const hasDocuments = documents.length > 0;

  const citedDocIds = useMemo(() => {
    const ids = new Set<string>();
    for (const msg of messages) {
      for (const citation of msg.citations ?? []) {
        ids.add(citation.doc_id);
      }
    }
    return ids;
  }, [messages]);

  function handleSend(text: string) {
    if (!selected) return;
    sendMessage(text, Array.from(selectedDocIds), selected);
  }

  function handleAttach() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) upload(files);
    e.target.value = "";
  }

  async function handleNewConversation() {
    try {
      const newId = await createSession();
      switchSession(newId);
      clearMessages();
      setSelection([]);
      await refreshConvos();
    } catch (e) {
      console.error("Failed to create conversation", e);
    }
  }

  function handleSwitchConversation(conv: Conversation) {
    clearMessages();
    switchSession(conv.session_id);
    setSelection(conv.doc_ids);
  }

  async function handleDeleteConversation(sessionIdToDelete: string) {
    await deleteConversationApi(sessionIdToDelete);
    if (sessionIdToDelete === sessionId) {
      await handleNewConversation();
    } else {
      await refreshConvos();
    }
  }

  async function handleRenameConversation(sid: string, title: string) {
    await updateConversationTitle(sid, title);
    await refreshConvos();
  }

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-surface-muted">
        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasDocuments) {
    return (
      <UploadOverlay
        onUpload={(files, scope) => upload(files, scope)}
        isUploading={isUploading}
        uploadStage={uploadStage}
        isPrivileged={auth.isRole("professor", "admin")}
        error={uploadError}
      />
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40
        md:relative md:inset-auto md:z-auto md:flex-shrink-0
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <ConversationSidebar
          conversations={conversations}
          currentSessionId={sessionId}
          onNewConversation={() => {
            handleNewConversation();
            setSidebarOpen(false);
          }}
          onSwitchConversation={(conv) => {
            handleSwitchConversation(conv);
            setSidebarOpen(false);
          }}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          documents={documents}
          selectedDocIds={selectedDocIds}
          citedDocIds={citedDocIds}
          onToggleDoc={toggleSelection}
          onDeleteDoc={remove}
          onAddMore={handleAttach}
          collapsed={false}
          onCollapseToggle={() => setSidebarOpen((o) => !o)}
        />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden bg-white">
        <ChatWindow messages={messages} />
        <MessageInput
          onSend={handleSend}
          onAttach={handleAttach}
          disabled={isStreaming || selectedDocIds.size === 0 || !selected}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Mobile hamburger — floats when sidebar is hidden */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed bottom-20 left-3 z-50 p-2 bg-brand-navy rounded-full shadow-lg text-white/60 hover:text-white transition-colors"
          title="Menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Clear chat — shown when there are messages */}
      {messages.length > 0 && (
        <button
          onClick={clearMessages}
          className="hidden sm:block absolute top-3 right-3 text-xs text-brand-gray-text hover:text-brand-navy transition-colors z-10"
        >
          Effacer
        </button>
      )}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function AppHeader({
  auth,
  providerState,
}: {
  auth: AuthState;
  providerState: ProviderState;
}) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLibraryRoute = location.pathname === "/library";

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-brand-navy-border bg-brand-navy flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center shadow-sm shadow-brand-blue/50">
          <svg
            className="w-4 h-4 text-white"
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
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            to="/"
            className="text-white font-bold text-sm tracking-tight hover:text-white/80 transition-colors"
          >
            ENSET AI
          </Link>
          <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
        </div>
        {auth.isRole("admin", "professor") && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
            {auth.user!.role}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Nav */}
        <nav className="flex items-center gap-1 mr-2">
          <Link
            to="/"
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              !isAdminRoute && !isLibraryRoute
                ? "bg-brand-blue text-white"
                : "text-white/50 hover:text-white hover:bg-brand-navy-light"
            }`}
          >
            Chat
          </Link>
          {auth.isRole("professor", "admin") && (
            <Link
              to="/library"
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                isLibraryRoute
                  ? "bg-brand-blue text-white"
                  : "text-white/50 hover:text-white hover:bg-brand-navy-light"
              }`}
            >
              Bibliothèque
            </Link>
          )}
          {auth.isRole("admin") && (
            <Link
              to="/admin/dashboard"
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                isAdminRoute
                  ? "bg-brand-blue text-white"
                  : "text-white/50 hover:text-white hover:bg-brand-navy-light"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Model selector — only in chat */}
        {!isAdminRoute && !isLibraryRoute && (
          <ModelSelector
            providers={providerState.providers}
            selected={providerState.selected}
            onSelect={providerState.select}
            loading={providerState.loading}
          />
        )}

        {/* User */}
        <div className="flex items-center gap-2 ml-1">
          <div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
            {auth.user!.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-white/60 hidden sm:block max-w-[120px] truncate">
            {auth.user!.name}
          </span>
          <button
            onClick={auth.logout}
            title="Se déconnecter"
            className="p-1 text-white/40 hover:text-white/80 transition-colors"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const auth = useAuth();
  const providerState = useProviders();

  if (auth.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-surface-muted min-h-screen">
        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <ToastProvider>
        <LoginPage onLogin={auth.login} onRegister={auth.register} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen bg-brand-surface-muted">
        <AppHeader auth={auth} providerState={providerState} />

        <Routes>
          {auth.isRole("admin") && (
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="conversations" element={<AdminConversations />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          )}
          {auth.isRole("professor", "admin") && (
            <Route
              path="/library"
              element={<LibraryPage user={auth.user!} isRole={auth.isRole} />}
            />
          )}
          <Route
            path="*"
            element={<ChatArea auth={auth} providerState={providerState} />}
          />
        </Routes>
      </div>
    </ToastProvider>
  );
}
