import { useRef, useState, useMemo } from "react";
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
import { AdminPage } from "./components/AdminPage";
import { ToastProvider } from "./components/ToastProvider";
import {
  createSession,
  updateConversationTitle,
  deleteConversationApi,
} from "./api/client";
import type { Conversation } from "./types";

type View = "chat" | "admin";

export default function App() {
  const auth = useAuth();
  const { sessionId, loading: sessionLoading, switchSession } = useSession(auth.isAuthenticated);
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
  const { messages, isStreaming, sendMessage, clearMessages } = useChat(sessionId);
  const { providers, selected, loading: providersLoading, select } = useProviders();
  const { conversations, refresh: refreshConvos } = useConversations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<View>("chat");

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

  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-surface-muted min-h-screen">
        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen bg-brand-surface-muted">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-brand-navy-border bg-brand-navy flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Mobile hamburger — only visible on small screens when chat is open */}
            {view === "chat" && hasDocuments && (
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="md:hidden p-1 text-white/40 hover:text-white transition-colors mr-1"
                title="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center shadow-sm shadow-brand-blue/50">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setView("chat")}
                className="text-white font-bold text-sm tracking-tight hover:text-white/80 transition-colors"
              >
                ENSET AI
              </button>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
            </div>
            {auth.isRole("admin", "professor") && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                {auth.user!.role}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Nav links */}
            <nav className="flex items-center gap-1 mr-2">
              <button
                onClick={() => setView("chat")}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  view === "chat"
                    ? "bg-brand-blue text-white"
                    : "text-white/50 hover:text-white hover:bg-brand-navy-light"
                }`}
              >
                Chat
              </button>
              {auth.isRole("admin") && (
                <button
                  onClick={() => setView("admin")}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    view === "admin"
                      ? "bg-brand-blue text-white"
                      : "text-white/50 hover:text-white hover:bg-brand-navy-light"
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>

            <ModelSelector
              providers={providers}
              selected={selected}
              onSelect={select}
              loading={providersLoading}
            />
            {messages.length > 0 && view === "chat" && (
              <button
                onClick={clearMessages}
                className="text-xs text-white/40 hover:text-white/80 transition-colors hidden sm:block"
              >
                Effacer
              </button>
            )}

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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        {view === "admin" ? (
          <AdminPage />
        ) : !hasDocuments ? (
          <UploadOverlay
            onUpload={upload}
            isUploading={isUploading}
            uploadStage={uploadStage}
            error={uploadError}
          />
        ) : (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Mobile backdrop */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/40 z-30 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar — overlay on mobile, inline on desktop */}
            <div className={`
              fixed inset-y-0 left-0 z-40
              md:relative md:inset-auto md:z-auto md:flex-shrink-0
              transition-transform duration-200
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}>
              <ConversationSidebar
                conversations={conversations}
                currentSessionId={sessionId}
                onNewConversation={() => { handleNewConversation(); setSidebarOpen(false); }}
                onSwitchConversation={(conv) => { handleSwitchConversation(conv); setSidebarOpen(false); }}
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
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </ToastProvider>
  );
}
