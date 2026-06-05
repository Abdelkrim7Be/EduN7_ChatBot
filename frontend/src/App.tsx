import { useRef, useMemo, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { useDocuments } from "./hooks/useDocuments";
import { useChat } from "./hooks/useChat";
import { useProviders } from "./hooks/useProviders";
import { useConversations } from "./hooks/useConversations";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { MessageInput } from "./components/MessageInput";
import { ModelSelector } from "./components/ModelSelector";
import { LoginPage } from "./components/LoginPage";
import { ToastProvider } from "./components/ToastProvider";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutCheatsheet } from "./components/ShortcutCheatsheet";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminUsers } from "./components/admin/AdminUsers";
import { AdminDocuments } from "./components/admin/AdminDocuments";
import { AdminConversations } from "./components/admin/AdminConversations";
import { AdminSettings } from "./components/admin/AdminSettings";
import { LibraryPage } from "./components/LibraryPage";
import { LandingPage } from "./pages/LandingPage";
import { PrimitivePlayground } from "./pages/PrimitivePlayground";
import {
  createSession,
  updateConversationTitle,
  deleteConversationApi,
} from "./api/client";
import type { Conversation, Provider, SelectedModel } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ThemeState {
  theme: "dark" | "light";
  toggle: () => void;
}

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
  onToggleTheme,
  onOpenCheatsheet,
}: {
  auth: AuthState;
  providerState: ProviderState;
  onToggleTheme: () => void;
  onOpenCheatsheet: () => void;
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
  const {
    messages,
    isStreaming,
    sendMessage,
    regenerate,
    editMessage,
    stop,
    clearMessages,
  } = useChat(sessionId);
  const { conversations, refresh: refreshConvos } = useConversations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { selected } = providerState;

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

  function handleRegenerate() {
    if (!selected) return;
    regenerate(selected);
  }

  function handleEditMessage(id: string, text: string) {
    if (!selected) return;
    editMessage(id, text, Array.from(selectedDocIds), selected);
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

  function handleExportConversation() {
    const conv = conversations.find((c) => c.session_id === sessionId);
    const title = conv?.title ?? "Conversation";
    const date = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const lines: string[] = [
      `# ${title}`,
      "",
      `*Exporté le ${date}*`,
      "",
      "---",
      "",
    ];
    for (const msg of messages) {
      lines.push(msg.role === "user" ? "**Vous**" : "**ENSET AI**");
      lines.push("");
      lines.push(msg.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useKeyboardShortcuts([
    {
      key: "k",
      mod: true,
      description: "Palette",
      handler: () => setPaletteOpen(true),
      allowInInput: true,
    },
    {
      key: "/",
      mod: false,
      description: "Focuser input",
      handler: () => messageInputRef.current?.focus(),
    },
    {
      key: "n",
      mod: true,
      description: "Nouvelle conversation",
      handler: handleNewConversation,
      allowInInput: true,
    },
    {
      key: "e",
      mod: true,
      description: "Exporter",
      handler: handleExportConversation,
      allowInInput: true,
    },
  ]);

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden relative bg-canvas">
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

      <div className="flex flex-col flex-1 overflow-hidden bg-canvas">
        <ChatWindow
          messages={messages}
          userName={auth.user!.name}
          onSuggestion={setInputValue}
          documents={documents}
          onUpload={handleAttach}
          onDropFiles={(files) => upload(files, "private")}
          isStreaming={isStreaming}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
        />
        <MessageInput
          onSend={handleSend}
          onAttach={handleAttach}
          disabled={isStreaming || selectedDocIds.size === 0 || !selected}
          value={inputValue}
          onChange={setInputValue}
          isStreaming={isStreaming}
          onStop={stop}
          focusRef={messageInputRef}
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
          className="md:hidden fixed bottom-20 left-3 z-50 p-2.5 glass border border-hairline rounded-full shadow-elevated text-fg-secondary hover:text-fg transition-colors"
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

      {/* Chat actions — shown when there are messages */}
      {messages.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 absolute top-3 right-3 z-10">
          <button
            onClick={handleExportConversation}
            className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg hover:bg-surface-3 px-2 py-1 rounded-md transition-colors"
            title="Exporter la conversation"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exporter
          </button>
          <button
            onClick={clearMessages}
            className="text-xs text-fg-muted hover:text-fg hover:bg-surface-3 px-2 py-1 rounded-md transition-colors"
          >
            Effacer
          </button>
        </div>
      )}

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNewConversation={handleNewConversation}
        onExportConversation={handleExportConversation}
        onClearMessages={clearMessages}
        onToggleTheme={onToggleTheme}
        onOpenCheatsheet={onOpenCheatsheet}
        conversations={conversations}
        currentSessionId={sessionId ?? ""}
        onSwitchConversation={handleSwitchConversation}
        documents={documents}
        selectedDocIds={selectedDocIds}
        onToggleDoc={toggleSelection}
        canAccessLibrary={auth.isRole("professor", "admin")}
        canAccessAdmin={auth.isRole("admin")}
        hasMessages={messages.length > 0}
      />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function AppHeader({
  auth,
  providerState,
  themeState,
  onOpenCheatsheet,
}: {
  auth: AuthState;
  providerState: ProviderState;
  themeState: ThemeState;
  onOpenCheatsheet: () => void;
}) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLibraryRoute = location.pathname === "/library";
  const isDark = themeState.theme === "dark";

  const navLink = (active: boolean) =>
    `text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
      active
        ? "bg-accent text-accent-contrast shadow-glow"
        : "text-fg-muted hover:text-fg hover:bg-surface-3"
    }`;

  return (
    <header className="glass flex items-center justify-between px-4 py-2.5 border-b border-hairline flex-shrink-0 z-20">
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-glow">
          <svg
            className="w-[18px] h-[18px] text-accent-contrast"
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
            className="font-display text-fg font-bold text-[15px] tracking-tight hover:text-accent transition-colors"
          >
            ENSET AI
          </Link>
          <div className="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_rgb(var(--gold))]" />
        </div>
        {auth.isRole("admin", "professor") && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent-soft text-accent border border-accent/30">
            {auth.user!.role}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Nav */}
        <nav className="flex items-center gap-1 mr-2">
          <Link to="/" className={navLink(!isAdminRoute && !isLibraryRoute)}>
            Chat
          </Link>
          {auth.isRole("professor", "admin") && (
            <Link to="/library" className={navLink(isLibraryRoute)}>
              Bibliothèque
            </Link>
          )}
          {auth.isRole("admin") && (
            <Link to="/admin/dashboard" className={navLink(isAdminRoute)}>
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

        {/* User + controls */}
        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-hairline">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-accent-contrast text-xs font-bold flex-shrink-0 shadow-glow">
            {auth.user!.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-fg-secondary hidden sm:block max-w-[120px] truncate">
            {auth.user!.name}
          </span>

          {/* Shortcut cheatsheet trigger */}
          <button
            onClick={onOpenCheatsheet}
            title="Raccourcis clavier (?)"
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-3 transition-colors text-xs font-semibold"
          >
            ?
          </button>

          {/* Theme toggle */}
          <button
            onClick={themeState.toggle}
            title={isDark ? "Mode clair" : "Mode sombre"}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-3 transition-colors"
          >
            {isDark ? (
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
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
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
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={auth.logout}
            title="Se déconnecter"
            className="p-1.5 rounded-lg text-fg-muted hover:text-danger hover:bg-surface-3 transition-colors"
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
  const themeState = useTheme();
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "?",
      mod: false,
      description: "Raccourcis clavier",
      handler: () => setCheatsheetOpen(true),
    },
  ]);

  if (auth.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas min-h-screen">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <ToastProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage onLogin={auth.login} onRegister={auth.register} />
            }
          />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen bg-canvas">
        <AppHeader
          auth={auth}
          providerState={providerState}
          themeState={themeState}
          onOpenCheatsheet={() => setCheatsheetOpen(true)}
        />

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
          {import.meta.env.DEV && (
            <Route path="/dev/playground" element={<PrimitivePlayground />} />
          )}
          <Route
            path="*"
            element={
              <ChatArea
                auth={auth}
                providerState={providerState}
                onToggleTheme={themeState.toggle}
                onOpenCheatsheet={() => setCheatsheetOpen(true)}
              />
            }
          />
        </Routes>

        <ShortcutCheatsheet
          open={cheatsheetOpen}
          onClose={() => setCheatsheetOpen(false)}
        />
      </div>
    </ToastProvider>
  );
}
