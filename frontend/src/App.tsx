import { useRef, useState } from "react";
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
import {
  createSession,
  updateConversationTitle,
  deleteConversationApi,
} from "./api/client";
import type { Conversation } from "./types";

export default function App() {
  const auth = useAuth();
  const { sessionId, loading: sessionLoading, switchSession } = useSession();
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

  const hasDocuments = documents.length > 0;

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

  // Auth loading
  if (auth.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
        <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated → show login
  if (!auth.isAuthenticated) {
    return <LoginPage onLogin={auth.login} onRegister={auth.register} />;
  }

  // Session loading
  if (sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
        <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-brand-gray bg-brand-surface">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-purple flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">EduN7</span>
          {auth.isRole("admin", "professor") && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple-light">
              {auth.user!.role}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector
            providers={providers}
            selected={selected}
            onSelect={select}
            loading={providersLoading}
          />
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear chat
            </button>
          )}

          {/* User initials + logout */}
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {auth.user!.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-400 hidden sm:block max-w-[120px] truncate">
              {auth.user!.name}
            </span>
            <button
              onClick={auth.logout}
              title="Sign out"
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
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
      {!hasDocuments ? (
        <UploadOverlay
          onUpload={upload}
          isUploading={isUploading}
          uploadStage={uploadStage}
          error={uploadError}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <ConversationSidebar
            conversations={conversations}
            currentSessionId={sessionId}
            onNewConversation={handleNewConversation}
            onSwitchConversation={handleSwitchConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            documents={documents}
            selectedDocIds={selectedDocIds}
            onToggleDoc={toggleSelection}
            onDeleteDoc={remove}
            onAddMore={handleAttach}
            collapsed={!sidebarOpen}
            onCollapseToggle={() => setSidebarOpen((o) => !o)}
          />
          <div className="flex flex-col flex-1 overflow-hidden">
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
  );
}
