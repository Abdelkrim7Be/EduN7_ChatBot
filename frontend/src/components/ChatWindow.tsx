import { useEffect, useRef, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
}

const aiTools = [
  {
    label: "Générer un résumé complet",
    prompt: "Générez un résumé complet et structuré de ce document",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    label: "Créer un QCM interactif",
    prompt:
      "Créez un QCM de 5 questions basé sur ce document avec les réponses correctes",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    label: "Traduire un document",
    prompt: "Traduisez les points principaux de ce document en anglais",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    ),
  },
];

const STATUS_LABELS: Record<string, string> = {
  uploading: "Envoi…",
  parsing: "Extraction…",
  chunking: "Découpage…",
  embedding: "Embeddings…",
  ready: "Prêt",
  failed: "Erreur d'analyse",
};

function formatTimeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "ready") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Prêt
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
        Erreur d'analyse
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue/8 text-brand-blue border border-brand-blue/20">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
      {STATUS_LABELS[status] ?? "Traitement…"}
    </span>
  );
}

function DashboardState({
  userName,
  documents,
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
  const firstName = userName.split(" ")[0];
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

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
    if (!onDropFiles) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );
    if (files.length) onDropFiles(files);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-brand-surface-muted dark:bg-brand-navy">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center mb-3 shadow-md shadow-brand-blue/30">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-brand-navy dark:text-white">
            ENSET AI
          </h1>
          <p className="text-sm text-brand-gray-text dark:text-white/60 mt-1 max-w-sm">
            Bonjour, {firstName} — importez vos documents PDF et posez vos
            questions grâce à l'IA
          </p>
        </motion.div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-5 items-start">
          {/* Left/Main: upload zone + docs table */}
          <div className="flex flex-col gap-4">
            {/* Upload drop zone */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={onUpload}
              className={`bg-white dark:bg-brand-navy-light rounded-2xl border-2 border-dashed transition-all cursor-pointer p-8 text-center ${
                isDragging
                  ? "border-brand-blue bg-brand-blue/5 scale-[1.01] shadow-md"
                  : "border-brand-gray dark:border-brand-navy-border hover:border-brand-blue/50 hover:shadow-md"
              }`}
            >
              <svg
                className="w-9 h-9 text-brand-gray-mid mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm font-medium text-brand-navy dark:text-white/90 mb-1">
                Glissez vos PDF ici, ou{" "}
                <span className="text-brand-blue">parcourez vos fichiers</span>
              </p>
              <p className="text-xs text-brand-gray-text dark:text-white/50">
                Plusieurs PDF acceptés
              </p>
            </motion.div>

            {/* Recently loaded docs table */}
            {documents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="bg-white dark:bg-brand-navy-light rounded-2xl border border-brand-gray dark:border-brand-navy-border overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-brand-gray dark:border-brand-navy-border">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-brand-gray-text dark:text-white/50">
                    Documents chargés récemment
                  </h3>
                </div>
                <div className="divide-y divide-brand-gray/50 dark:divide-brand-navy-border/50">
                  {documents.slice(0, 8).map((doc) => (
                    <div
                      key={doc.doc_id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-brand-surface-muted/50 dark:hover:bg-brand-navy/50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3.5 h-3.5 text-brand-blue"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-navy dark:text-white/90 truncate">
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-brand-gray-text dark:text-white/40">
                          {formatTimeAgo(doc.uploaded_at)}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: AI tools */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="flex flex-col gap-3"
          >
            {/* Bibliothèque shortcut */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.3 }}
              onClick={() => navigate("/library")}
              className="w-full py-3 px-4 rounded-xl bg-brand-blue text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-blue-dark transition-colors shadow-sm shadow-brand-blue/25"
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
                  d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                />
              </svg>
              Bibliothèque
            </motion.button>

            {/* AI suggestion actions — horizontal list, not identical cards */}
            <div className="bg-white dark:bg-brand-navy-light rounded-2xl border border-brand-gray dark:border-brand-navy-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-brand-gray dark:border-brand-navy-border">
                <h3 className="text-[11px] font-medium text-brand-gray-text dark:text-white/40">
                  Suggestions rapides
                </h3>
              </div>
              <div className="divide-y divide-brand-gray/50 dark:divide-brand-navy-border/50">
                {aiTools.map((tool, i) => (
                  <motion.button
                    key={tool.label}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.22 }}
                    onClick={() => onSuggestion(tool.prompt)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-brand-surface-muted dark:hover:bg-brand-navy/60 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-blue/8 dark:bg-brand-blue/15 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-blue/15 dark:group-hover:bg-brand-blue/25 transition-colors">
                      <span className="text-brand-blue dark:text-brand-blue-light [&_svg]:w-4 [&_svg]:h-4">
                        {tool.icon}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-brand-navy dark:text-white/80 group-hover:text-brand-blue dark:group-hover:text-white transition-colors leading-snug">
                      {tool.label}
                    </span>
                    <svg
                      className="w-3 h-3 text-brand-gray-mid dark:text-white/20 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
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
  isStreaming = false,
  onRegenerate,
  onEditMessage,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <DashboardState
        userName={userName}
        documents={documents}
        onUpload={onUpload}
        onDropFiles={onDropFiles}
        onSuggestion={onSuggestion}
      />
    );
  }

  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4 bg-white dark:bg-brand-navy"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={isStreaming}
    >
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLastAssistant={i === lastAssistantIdx}
          canInteract={!isStreaming}
          onRegenerate={onRegenerate}
          onEdit={onEditMessage}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
