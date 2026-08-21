import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { Bot, Send, Loader2, StopCircle } from "lucide-react";
import { useProviders } from "../../hooks/useProviders";
import { useDocuments } from "../../hooks/useDocuments";
import { useChat } from "../../hooks/useChat";
import { createSession } from "../../api/client";
import { useToast } from "../ToastProvider";
import ReactMarkdown from "react-markdown";

export function AdminChatTest() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const { providers, selected, select, currentProvider, currentModel } = useProviders();
  const { documents } = useDocuments("all");
  
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  
  const { messages, isStreaming, sendMessage, stop } = useChat(sessionId || "", (msg) => {
    toast(msg, "error");
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createSession()
      .then(setSessionId)
      .catch(() => toast("Erreur lors de la création de la session de test", "error"));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function toggleDoc(id: string) {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocs(newSet);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !sessionId || isStreaming || !selected) return;
    
    sendMessage(input, Array.from(selectedDocs), selected);
    setInput("");
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas p-6 max-w-7xl mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-fg flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" />
          Test Chatbot
        </h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Interface de test du RAG avec sélection personnalisée
        </p>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Left Panel: Controls */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2">
          {/* Provider Selection */}
          <div className="bg-surface-1 p-4 rounded-2xl border border-hairline shadow-soft space-y-3">
            <h2 className="text-sm font-semibold text-fg">Modèle LLM</h2>
            
            <div className="space-y-2">
              {providers.map((p) => (
                <div key={p.id} className="space-y-1">
                  <p className="text-xs font-medium text-fg-secondary">{p.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.models.map((m) => {
                      const isActive = selected?.provider === p.id && selected?.model === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => select(p.id, m.id)}
                          className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                            isActive
                              ? "bg-accent/10 text-accent border-accent/30 shadow-[inset_0_0_0_1px_rgba(var(--color-accent),0.2)]"
                              : "bg-surface-2 text-fg-secondary border-hairline hover:border-fg-muted hover:text-fg"
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Selection */}
          <div className="bg-surface-1 p-4 rounded-2xl border border-hairline shadow-soft flex-1 overflow-y-auto space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-fg">Documents à inclure</h2>
              <span className="text-xs bg-surface-2 px-2 py-0.5 rounded-full text-fg-secondary">
                {selectedDocs.size} / {documents.length}
              </span>
            </div>
            
            <div className="space-y-1">
              {documents.map((doc) => (
                <label key={doc.doc_id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-surface-2 cursor-pointer transition-colors group">
                  <div className="relative flex items-center justify-center pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedDocs.has(doc.doc_id)}
                      onChange={() => toggleDoc(doc.doc_id)}
                      className="w-4 h-4 rounded-md border-hairline text-accent focus:ring-accent/30 bg-surface-2 cursor-pointer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate group-hover:text-accent transition-colors">
                      {doc.original_filename}
                    </p>
                    <p className="text-[10px] text-fg-muted uppercase tracking-wider">
                      {doc.scope === "shared" ? "Partagé" : "Privé"}
                    </p>
                  </div>
                </label>
              ))}
              {documents.length === 0 && (
                <p className="text-xs text-fg-muted text-center py-4">Aucun document disponible</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="flex-1 flex flex-col bg-surface-1 rounded-2xl border border-hairline shadow-soft overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-fg-muted space-y-3">
                <Bot className="w-12 h-12 opacity-20" />
                <p className="text-sm">Envoyez un message pour commencer le test</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === "user" 
                      ? "bg-accent text-accent-contrast rounded-br-sm" 
                      : "bg-surface-2 text-fg rounded-bl-sm border border-hairline"
                  }`}>
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                    
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-hairline/30">
                        <p className="text-[10px] uppercase font-bold text-fg-muted mb-1.5">Sources :</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((cit, idx) => (
                            <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-canvas border border-hairline text-fg-secondary">
                              [{idx + 1}] {cit.doc_name} (p. {cit.page_number})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-surface-1 border-t border-hairline">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming}
                placeholder="Message de test..."
                className="w-full bg-surface-2 border border-hairline rounded-2xl py-3 pl-4 pr-12 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-transparent transition-all shadow-sm"
              />
              <div className="absolute right-2 flex">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="p-1.5 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                  >
                    <StopCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() || !selected}
                    className="p-1.5 text-accent hover:bg-accent/10 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
            <div className="mt-2 text-[10px] text-center text-fg-muted">
              {currentProvider ? `${currentProvider.name} / ${currentModel?.name}` : "Sélectionnez un modèle"} • {selectedDocs.size} doc(s) inclus
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
