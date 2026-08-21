import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { UploadCloud, Sparkles, BookOpen, FileText, List, Download, Trash2 } from "lucide-react";
import type { Message, DocumentRecord } from "../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  userName: string;
  onSuggestion: (text: string) => void;
  documents?: DocumentRecord[];
  onUpload?: () => void;
  onDropFiles?: (files: File[]) => void;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (id: string, text: string) => void;
  onExport?: () => void;
  onClear?: () => void;
  /** Rendered in the workspace toolbar — used for the model selector. */
  toolbar?: ReactNode;
}

const aiTools = [
  { label: "Résumé", prompt: "Génère un résumé structuré et complet de ce document", icon: FileText },
  { label: "Expliquer les concepts", prompt: "Explique les concepts clés de ce document simplement", icon: Sparkles },
  { label: "Points clés", prompt: "Extraire les points les plus importants du texte", icon: List },
  { label: "Créer un Quiz", prompt: "Crée un quiz à choix multiples de 5 questions basé sur ce document", icon: BookOpen },
];

function DashboardState({
  userName,
  onUpload,
  onDropFiles,
  onSuggestion,
}: {
  userName: string;
  documents: DocumentRecord[];
  onUpload?: () => void;
  onDropFiles?: (files: File[]) => void;
  onSuggestion: (t: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length && onDropFiles) {
      onDropFiles(Array.from(e.dataTransfer.files));
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col items-center justify-center p-8 transition-colors ${
        isDragging ? "bg-white/5" : ""
      }`}
    >
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 font-mono">
          System Initialized
        </div>
        <h2 className="text-3xl font-serif mb-2 text-white">
          Welcome back, {userName.split(" ")[0]}.
        </h2>
        <p className="text-gray-400 text-sm mb-12 max-w-md font-mono">
          Ready to process institutional knowledge, synthesize documents, or architect new solutions.
        </p>

        <div className="w-full flex flex-col items-center gap-6">
          <div
            className="w-full max-w-sm border border-dashed border-border-heavy rounded-sm p-8 text-center cursor-pointer hover:border-white hover:bg-white/5 transition-all"
            onClick={onUpload}
          >
            <div className="text-white mb-2 flex justify-center">
                <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm text-gray-300 font-mono mb-1">
              Drag & drop resources
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">
              PDF uniquement · 50 Mo max
            </div>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-2 font-mono">
            {aiTools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <button
                  key={i}
                  onClick={() => onSuggestion(tool.prompt)}
                  className="w-full flex items-center justify-between p-3 border border-border-subtle bg-surface-dim hover:bg-surface-bright hover:border-border-heavy transition-all rounded-sm text-left group"
                >
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tool.label}
                  </span>
                  <span className="text-gray-600 group-hover:text-white">→</span >
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatWindow({
  messages,
  userName,
  onSuggestion,
  documents = [],
  onUpload,
  onDropFiles,
  isStreaming,
  onRegenerate,
  onEditMessage,
  onExport,
  onClear,
  toolbar,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isAtBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      setUserScrolled(!isAtBottom);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!userScrolled && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, userScrolled]);

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      <div className="h-14 border-b border-border-subtle flex items-center justify-between px-6 shrink-0 bg-[#000000]/80 backdrop-blur-md absolute top-0 left-0 w-full z-10">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-mono">
          Chat Workspace
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {toolbar}
          <button onClick={onExport} className="text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
            <Download className="w-3 h-3" /> EXPORT
          </button>
          <button onClick={onClear} className="text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors">
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pt-14 pb-4 px-4 sm:px-6 lg:px-8 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <DashboardState
            userName={userName}
            documents={documents}
            onUpload={onUpload}
            onDropFiles={onDropFiles}
            onSuggestion={onSuggestion}
          />
        ) : (
          <div className="max-w-4xl mx-auto py-8 space-y-8 flex flex-col min-h-full">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isLast={i === messages.length - 1}
                isStreaming={isStreaming}
                onRegenerate={onRegenerate}
                onEdit={onEditMessage}
              />
            ))}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {userScrolled && messages.length > 0 && (
        <button
          onClick={() => {
            setUserScrolled(false);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-bright text-white px-4 py-1 rounded-full text-xs shadow-lg hover:bg-white hover:text-black transition-colors z-20 font-mono"
        >
          ↓ Scroll to bottom
        </button>
      )}
    </div>
  );
}
