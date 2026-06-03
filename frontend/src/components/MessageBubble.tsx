import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Citation, Message } from "../types";
import { CitationCard } from "./CitationCard";
import { CodeBlock } from "./CodeBlock";
import { StreamingIndicator } from "./StreamingIndicator";

interface Props {
  message: Message;
  isLastAssistant?: boolean;
  canInteract?: boolean;
  onRegenerate?: () => void;
  onEdit?: (id: string, text: string) => void;
}

function renderWithCitations(
  text: string,
  citations?: Citation[],
): React.ReactNode {
  const parts = text.split(/(\[\d+\])/);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const c = citations?.[n - 1];
      return (
        <span
          key={i}
          className="cite-ref"
          title={c ? `${c.doc_name} · p.${c.page_number}` : `Source ${n}`}
        >
          {n}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

type MdP = React.ComponentProps<"p"> & { node?: unknown };
type MdLi = React.ComponentProps<"li"> & { node?: unknown };
type MdCode = React.ComponentProps<"code"> & { node?: unknown };
type MdPre = React.ComponentProps<"pre"> & { node?: unknown };

function makeComponents(citations?: Citation[]) {
  return {
    p({ children, node: _n, ...rest }: MdP) {
      return (
        <p {...rest}>
          {React.Children.map(children, (child) =>
            typeof child === "string"
              ? renderWithCitations(child, citations)
              : child,
          )}
        </p>
      );
    },
    li({ children, node: _n, ...rest }: MdLi) {
      return (
        <li {...rest}>
          {React.Children.map(children, (child) =>
            typeof child === "string"
              ? renderWithCitations(child, citations)
              : child,
          )}
        </li>
      );
    },
    // Unwrap <pre> — CodeBlock renders its own container.
    pre({ children }: MdPre) {
      return <>{children}</>;
    },
    code({ className, children, node: _n, ...rest }: MdCode) {
      const match = /language-(\w+)/.exec(className ?? "");
      const raw = String(children ?? "");
      const isBlock = !!match || raw.includes("\n");
      if (isBlock) {
        return (
          <CodeBlock code={raw.replace(/\n$/, "")} lang={match?.[1] ?? ""} />
        );
      }
      return (
        <code
          className="rounded bg-brand-blue/10 dark:bg-brand-blue/20 px-1.5 py-0.5 text-[0.85em] font-mono text-brand-blue dark:text-brand-blue-light"
          {...rest}
        >
          {children}
        </code>
      );
    },
  };
}

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": ["className"],
  },
};

export function MessageBubble({
  message,
  isLastAssistant,
  canInteract = true,
  onRegenerate,
  onEdit,
}: Props) {
  const isUser = message.role === "user";
  const showCursor = !isUser && !!message.isStreaming && !!message.content;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const displayContent = showCursor ? message.content + "▌" : message.content;

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function startEdit() {
    setDraft(message.content);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed);
    }
    setEditing(false);
  }

  return (
    <div
      className={`flex w-full mb-4 animate-message-in ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow-sm shadow-brand-blue/20">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
      )}

      <div
        className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col group/msg`}
      >
        {editing ? (
          <div className="w-full min-w-[260px] rounded-2xl bg-white dark:bg-brand-navy-light border border-brand-blue/40 p-2 shadow-soft">
            <textarea
              ref={editRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                const el = e.target;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  setEditing(false);
                }
              }}
              className="w-full resize-none bg-transparent text-sm text-brand-navy dark:text-white/90 outline-none leading-relaxed max-h-60"
              rows={1}
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-2.5 py-1 rounded-lg text-brand-gray-text hover:text-brand-navy dark:hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                className="text-xs px-3 py-1 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue-dark transition-colors"
              >
                Envoyer
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-brand-blue text-white rounded-br-sm shadow-sm shadow-brand-blue/20"
                : "bg-brand-surface-muted dark:bg-brand-navy-light text-brand-navy dark:text-white/90 rounded-bl-sm border border-brand-gray dark:border-brand-navy-border"
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : message.isStreaming && !message.content ? (
              <StreamingIndicator />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[
                    [rehypeSanitize, SANITIZE_SCHEMA],
                    rehypeKatex,
                  ]}
                  components={
                    makeComponents(message.citations) as Parameters<
                      typeof ReactMarkdown
                    >[0]["components"]
                  }
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* User message actions — edit */}
        {isUser && !editing && canInteract && onEdit && (
          <div className="flex items-center gap-1 px-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
            <button
              onClick={startEdit}
              title="Modifier le message"
              aria-label="Modifier le message"
              className="flex items-center gap-1 text-[10px] text-brand-gray-text hover:text-brand-blue transition-colors px-1.5 py-0.5 rounded hover:bg-brand-gray dark:hover:bg-brand-navy-light"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Modifier
            </button>
          </div>
        )}

        {/* AI message actions */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-1 px-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              title={copied ? "Copié !" : "Copier la réponse"}
              aria-label={copied ? "Réponse copiée" : "Copier la réponse"}
              className="flex items-center gap-1 text-[10px] text-brand-gray-text hover:text-brand-blue transition-colors px-1.5 py-0.5 rounded hover:bg-brand-gray dark:hover:bg-brand-navy-light"
            >
              {copied ? (
                <svg
                  className="w-3 h-3 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
              {copied ? "Copié" : "Copier"}
            </button>

            {isLastAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={!canInteract}
                title="Régénérer la réponse"
                aria-label="Régénérer la réponse"
                className="flex items-center gap-1 text-[10px] text-brand-gray-text hover:text-brand-blue transition-colors px-1.5 py-0.5 rounded hover:bg-brand-gray dark:hover:bg-brand-navy-light disabled:opacity-40"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Régénérer
              </button>
            )}

            <button
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              title="Bonne réponse"
              aria-label="Bonne réponse"
              aria-pressed={feedback === "up"}
              className={`p-0.5 rounded transition-colors ${feedback === "up" ? "text-green-500" : "text-brand-gray-text hover:text-green-500"}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill={feedback === "up" ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
            </button>
            <button
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              title="Mauvaise réponse"
              aria-label="Mauvaise réponse"
              aria-pressed={feedback === "down"}
              className={`p-0.5 rounded transition-colors ${feedback === "down" ? "text-red-400" : "text-brand-gray-text hover:text-red-400"}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill={feedback === "down" ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                />
              </svg>
            </button>
          </div>
        )}

        {!isUser && message.actualProvider && (
          <p className="text-[10px] text-brand-gray-text dark:text-white/40 px-1 mt-0.5">
            ✦ via {message.actualProvider} · {message.actualModel}
          </p>
        )}

        {!isUser && message.citations !== undefined && (
          <div className="px-1 w-full">
            <CitationCard citations={message.citations} />
          </div>
        )}
      </div>
    </div>
  );
}
