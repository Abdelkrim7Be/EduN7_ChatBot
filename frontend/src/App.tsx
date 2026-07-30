import { useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { useDocuments } from "./hooks/useDocuments";
import { useChat } from "./hooks/useChat";
import { useProviders } from "./hooks/useProviders";
import { UploadRenameModal } from "./components/UploadRenameModal";
import { SettingsPage } from "./components/SettingsPage";
import { useConversations } from "./hooks/useConversations";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { LibrarySidebar } from "./components/LibrarySidebar";
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
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [pendingUploads, setPendingUploads] = useState<{files: File[], visibility: "private" | "shared"} | null>(null);
  const [fileToRename, setFileToRename] = useState<{file: File, index: number} | null>(null);

  const isValidName = (name: string) => /^[A-Z0-9]+_[A-Z0-9]+_.+\.pdf$/i.test(name);

  function processUploads(files: File[], visibility: "private" | "shared" = "private") {
    const invalidIndex = files.findIndex(f => !isValidName(f.name));
    if (invalidIndex !== -1) {
      setPendingUploads({ files, visibility });
      setFileToRename({ file: files[invalidIndex], index: invalidIndex });
    } else {
      upload(files, visibility);
    }
  }

  function handleRenameConfirm(renamedFile: File) {
    if (!pendingUploads || !fileToRename) return;
    const newFiles = [...pendingUploads.files];
    newFiles[fileToRename.index] = renamedFile;
    
    setFileToRename(null);
    setPendingUploads(null); // Clear temporarily
    
    // Reprocess with updated array
    processUploads(newFiles, pendingUploads.visibility);
  }

  function handleRenameCancel() {
    setFileToRename(null);
    setPendingUploads(null);
  }

  const { selected } = providerState;

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
    if (files.length) processUploads(files, "private");
    e.target.value = "";
  }

  async function handleNewConversation(force: boolean | unknown = false) {
    if (force !== true && messages.length === 0) return;
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
      await handleNewConversation(true);
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
    const date = new Date().toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const lines: string[] = [
      `# ${title}`,
      "",
      `*Exported on ${date}*`,
      "",
      "---",
      "",
    ];
    for (const msg of messages) {
      lines.push(msg.role === "user" ? "**You**" : "**ENSET AI**");
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
      <div className="flex-1 flex items-center justify-center bg-[#000000] paper-texture">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden relative bg-[#000000] paper-texture min-h-0">
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
        transition-all duration-200
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
          collapsed={!sidebarOpen}
          onCollapseToggle={() => setSidebarOpen((o) => !o)}
          user={auth.user}
        />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden bg-[#000000] paper-texture relative min-h-0">
        {/* Toggle Left Sidebar */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-4 z-10 p-1.5 glass border border-border-subtle rounded-md text-white/50 hover:text-white transition-all hidden md:block ${sidebarOpen ? 'left-4' : 'left-4'}`}
          title={sidebarOpen ? "Hide conversations" : "Show conversations"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {/* Floating toggle for left sidebar still here if needed */}

        <ChatWindow
          messages={messages}
          userName={auth.user!.name}
          onSuggestion={(text) => handleSend(text)}
          documents={documents}
          onUpload={handleAttach}
          onDropFiles={(files) => processUploads(files, "private")}
          isStreaming={isStreaming}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onExport={handleExportConversation}
          onClear={() => handleNewConversation(true)}
        />
        <MessageInput
          onSend={handleSend}
          onAttach={handleAttach}
          disabled={isStreaming || !selected}
          value={inputValue}
          onChange={setInputValue}
          isStreaming={isStreaming}
          onStop={stop}
          focusRef={messageInputRef}
          suggestions={
            messages.length > 0 && selectedDocIds.size > 0
              ? [
                  { label: "Summarize", prompt: "Can you provide a detailed summary of the attached document(s)?" },
                  { label: "Key Concepts", prompt: "What are the most important concepts discussed in these documents?" },
                  { label: "Generate Quiz", prompt: "Create a 5-question multiple choice quiz based on these documents." },
                ]
              : undefined
          }
          onSuggestion={handleSend}
        />
      </div>

      {/* Right Sidebar - Library */}
      <div className={`hidden lg:block transition-all duration-300 ease-in-out ${rightSidebarOpen ? 'w-80' : 'w-16'}`}>
        <div className="h-full">
          <LibrarySidebar
            documents={documents}
            selectedDocIds={selectedDocIds}
            onToggleDoc={toggleSelection}
            onDeleteDoc={remove}
            onAddMore={handleAttach}
            onSetSelection={setSelection}
            collapsed={!rightSidebarOpen}
            onCollapseToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
          />
        </div>
      </div>

      <UploadRenameModal 
        isOpen={!!fileToRename}
        file={fileToRename?.file as File}
        onCancel={handleRenameCancel}
        onConfirm={handleRenameConfirm}
      />

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
          className="md:hidden fixed bottom-20 left-3 z-50 p-2.5 glass border border-border-subtle rounded-full shadow-elevated text-white-secondary hover:text-white transition-colors"
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
        : "text-white-muted hover:text-white hover:bg-surface-bright"
    }`;

  return (
    <header className="glass flex items-center justify-between px-4 py-2.5 border-b border-border-subtle flex-shrink-0 z-20">
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-glow overflow-hidden">
          <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            to="/"
            className="font-display text-white font-bold text-[15px] tracking-tight hover:text-accent transition-colors"
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
        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border-subtle">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-accent-contrast text-xs font-bold flex-shrink-0 shadow-glow">
            {auth.user!.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-white-secondary hidden sm:block max-w-[120px] truncate">
            {auth.user!.name}
          </span>

          {/* Shortcut cheatsheet trigger */}
          <button
            onClick={onOpenCheatsheet}
            title="Raccourcis clavier (?)"
            className="p-1.5 rounded-lg text-white-muted hover:text-white hover:bg-surface-bright transition-colors text-xs font-semibold"
          >
            ?
          </button>

          {/* Theme toggle */}
          <button
            onClick={themeState.toggle}
            title={isDark ? "Mode clair" : "Mode sombre"}
            className="p-1.5 rounded-lg text-white-muted hover:text-white hover:bg-surface-bright transition-colors"
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
            className="p-1.5 rounded-lg text-white-muted hover:text-danger hover:bg-surface-bright transition-colors"
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
  const location = useLocation();

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
      <div className="flex-1 flex items-center justify-center bg-[#000000] paper-texture min-h-screen">
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
      <div className="flex flex-col h-[100dvh] bg-[#000000] paper-texture">
        {location.pathname.startsWith("/admin") && (
          <AppHeader
            auth={auth}
            providerState={providerState}
            themeState={themeState}
            onOpenCheatsheet={() => setCheatsheetOpen(true)}
          />
        )}

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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/welcome" element={<LandingPage />} />
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
