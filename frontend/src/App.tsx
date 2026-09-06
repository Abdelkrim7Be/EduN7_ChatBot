import { useRef, useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import { ToastProvider, useToast } from "./components/ToastProvider";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutCheatsheet } from "./components/ShortcutCheatsheet";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminUsers } from "./components/admin/AdminUsers";
import { AdminDocuments } from "./components/admin/AdminDocuments";
import { AdminConversations } from "./components/admin/AdminConversations";
import { AdminSettings } from "./components/admin/AdminSettings";
import { AdminChatTest } from "./components/admin/AdminChatTest";
import { AdminRoles } from "./components/admin/AdminRoles";
import { AdminAuditLog } from "./components/admin/AdminAuditLog";
import { AdminAnnouncements } from "./components/admin/AdminAnnouncements";
import { LibraryPage } from "./components/LibraryPage";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { ForbiddenPage } from "./components/ForbiddenPage";
import { LandingPage } from "./pages/LandingPage";
import {
  createSession,
  updateConversationTitle,
  deleteConversationApi,
} from "./api/client";
import type { Conversation, Provider, SelectedModel, User } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isRole: (...roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
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
  } = useSession(auth.user?.id ?? null);
  const {
    documents,
    selectedDocIds,
    upload,
    remove,
    toggleSelection,
    setSelection,
    uploadError,
  } = useDocuments(sessionId);
  const { toast } = useToast();
  const {
    messages,
    isStreaming,
    sendMessage,
    regenerate,
    editMessage,
    stop,
    clearMessages,
  } = useChat(sessionId, (msg) => toast(msg, "error"));
  const { conversations, refresh: refreshConvos } = useConversations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [pendingUploads, setPendingUploads] = useState<{files: File[], visibility: "private" | "shared"} | null>(null);
  const [filesToRename, setFilesToRename] = useState<{file: File, index: number}[]>([]);

  const isValidName = (name: string) => /^[A-Z0-9]+_[A-Z0-9]+_.+\.pdf$/i.test(name);

  function processUploads(files: File[], visibility: "private" | "shared" = "private") {
    const invalidFiles = files.map((f, i) => ({ file: f, index: i })).filter(x => !isValidName(x.file.name));
    
    if (invalidFiles.length > 0) {
      setPendingUploads({ files, visibility });
      setFilesToRename(invalidFiles);
    } else {
      upload(files, visibility);
    }
  }

  function handleRenameConfirm(renamedFiles: { file: File, index: number }[]) {
    if (!pendingUploads) return;
    const newFiles = [...pendingUploads.files];
    renamedFiles.forEach(rf => {
      newFiles[rf.index] = rf.file;
    });
    
    setFilesToRename([]);
    setPendingUploads(null); // Clear temporarily
    
    // Reprocess with updated array
    processUploads(newFiles, pendingUploads.visibility);
  }

  function handleRenameCancel() {
    setFilesToRename([]);
    setPendingUploads(null);
  }

  useEffect(() => {
    if (uploadError) {
      toast(uploadError, "error");
    }
  }, [uploadError, toast]);

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
    if (!selected) {
      toast("Choisissez un modèle avant de renvoyer le message modifié", "error");
      return;
    }
    editMessage(id, text, Array.from(selectedDocIds), selected);
  }

  const [uploadIntent, setUploadIntent] = useState<"private" | "shared">("private");

  function handleAttach(intent: "private" | "shared" = "private") {
    setUploadIntent(intent);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) processUploads(files, uploadIntent);
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
      console.error("Échec de la création de la conversation", e);
    }
  }

  function handleClearConversation() {
    if (!messages.length) return;
    const confirmed = window.confirm("Effacer cette conversation et démarrer une nouvelle session ?");
    if (confirmed) void handleNewConversation(true);
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
        <ChatWindow
          messages={messages}
          userName={auth.user!.name?.trim() || auth.user!.email.split("@")[0] || "Utilisateur"}
          onSuggestion={(text) => handleSend(text)}
          documents={documents}
          onUpload={handleAttach}
          onDropFiles={(files) => processUploads(files, "private")}
          isStreaming={isStreaming}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          onExport={handleExportConversation}
          onClear={handleClearConversation}
          toolbar={
            <ModelSelector
              providers={providerState.providers}
              selected={providerState.selected}
              onSelect={providerState.select}
              loading={providerState.loading}
            />
          }
        />
        <MessageInput
          onSend={handleSend}
          onAttach={() => handleAttach("private")}
          disabled={isStreaming || !selected}
          value={inputValue}
          onChange={setInputValue}
          isStreaming={isStreaming}
          onStop={stop}
          focusRef={messageInputRef}
          suggestions={
            messages.length > 0 && selectedDocIds.size > 0
              ? [
                  { label: "Résumer", prompt: "Peux-tu fournir un résumé détaillé des documents joints ?" },
                  { label: "Concepts clés", prompt: "Quels sont les concepts les plus importants abordés dans ces documents ?" },
                  { label: "Générer un quiz", prompt: "Crée un quiz à choix multiples de 5 questions basé sur ces documents." },
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
            onAddMore={() => handleAttach("private")}
            onSetSelection={setSelection}
            collapsed={!rightSidebarOpen}
            onCollapseToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
          />
        </div>
      </div>

      <UploadRenameModal 
        isOpen={filesToRename.length > 0}
        files={filesToRename}
        onCancel={handleRenameCancel}
        onConfirm={handleRenameConfirm}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="sr-only"
        tabIndex={-1}
        title=""
        style={{ pointerEvents: 'none' }}
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
        onClearMessages={handleClearConversation}
        onToggleTheme={onToggleTheme}
        onOpenCheatsheet={onOpenCheatsheet}
        conversations={conversations}
        currentSessionId={sessionId ?? ""}
        onSwitchConversation={handleSwitchConversation}
        documents={documents}
        selectedDocIds={selectedDocIds}
        onToggleDoc={toggleSelection}
        canAccessLibrary={auth.hasPermission("library.view") || auth.isRole("professor", "admin")}
        canAccessAdmin={
          auth.isRole("admin") ||
          !!auth.user?.permissions?.some((p) => p.startsWith("admin."))
        }
        hasMessages={messages.length > 0}
      />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const auth = useAuth();
  const providerState = useProviders(auth.isAuthenticated);
  const themeState = useTheme();
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const can = (permission: string) => auth.isRole("admin") || auth.hasPermission(permission);
  const canAccessAdmin =
    auth.isRole("admin") || !!auth.user?.permissions?.some((p) => p.startsWith("admin."));
  const adminDefault =
    [
      ["admin.dashboard.view", "/admin/dashboard"],
      ["admin.users.manage", "/admin/users"],
      ["admin.roles.manage", "/admin/roles"],
      ["admin.documents.manage", "/admin/documents"],
      ["admin.conversations.manage", "/admin/conversations"],
      ["admin.audit.view", "/admin/audit-log"],
      ["admin.announcements.manage", "/admin/announcements"],
      ["admin.ai.test", "/admin/ai-test"],
      ["admin.settings.manage", "/admin/settings"],
    ].find(([permission]) => can(permission))?.[1] ?? "/admin/dashboard";

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
        <AnnouncementBanner />

        <Routes>
          {!canAccessAdmin && (
            <Route path="/admin/*" element={<ForbiddenPage requiredRole="administrateur" />} />
          )}
          {!can("library.view") && !auth.isRole("professor") && (
            <Route
              path="/library"
              element={<ForbiddenPage requiredRole="professeur ou administrateur" />}
            />
          )}
          {canAccessAdmin && (
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={<Navigate to={adminDefault} replace />}
              />
              <Route path="dashboard" element={can("admin.dashboard.view") ? <AdminDashboard /> : <ForbiddenPage requiredRole="permission tableau de bord" />} />
              <Route path="users" element={can("admin.users.manage") ? <AdminUsers /> : <ForbiddenPage requiredRole="permission utilisateurs" />} />
              <Route path="documents" element={can("admin.documents.manage") ? <AdminDocuments /> : <ForbiddenPage requiredRole="permission documents" />} />
              <Route path="conversations" element={can("admin.conversations.manage") ? <AdminConversations /> : <ForbiddenPage requiredRole="permission conversations" />} />
              <Route path="settings" element={can("admin.settings.manage") ? <AdminSettings /> : <ForbiddenPage requiredRole="permission paramètres" />} />
              <Route path="ai-test" element={can("admin.ai.test") ? <AdminChatTest /> : <ForbiddenPage requiredRole="permission test ENSET AI" />} />
              <Route path="roles" element={can("admin.roles.manage") ? <AdminRoles /> : <ForbiddenPage requiredRole="permission rôles" />} />
              <Route path="audit-log" element={can("admin.audit.view") ? <AdminAuditLog /> : <ForbiddenPage requiredRole="permission audit" />} />
              <Route path="announcements" element={can("admin.announcements.manage") ? <AdminAnnouncements /> : <ForbiddenPage requiredRole="permission annonces" />} />
            </Route>
          )}
          {(can("library.view") || auth.isRole("professor")) && (
            <Route
              path="/library"
              element={<LibraryPage user={auth.user!} isRole={auth.isRole} />}
            />
          )}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/welcome" element={<LandingPage />} />
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
