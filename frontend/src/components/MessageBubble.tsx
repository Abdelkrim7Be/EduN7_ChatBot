import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Citation, Message } from "../types";
import { CitationCard } from "./CitationCard";
import { StreamingIndicator } from "./StreamingIndicator";

interface Props {
  message: Message;
}

function renderWithCitations(text: string, citations?: Citation[]): React.ReactNode {
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

type MdP  = React.ComponentProps<"p">  & { node?: unknown };
type MdLi = React.ComponentProps<"li"> & { node?: unknown };

function makeCited(citations?: Citation[]) {
  return {
    p({ children, node: _n, ...rest }: MdP) {
      return (
        <p {...rest}>
          {React.Children.map(children, (child) =>
            typeof child === "string"
              ? renderWithCitations(child, citations)
              : child
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
              : child
          )}
        </li>
      );
    },
  };
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const showCursor = !isUser && !!message.isStreaming && !!message.content;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const displayContent = showCursor ? message.content + "▌" : message.content;

  function handleCopy() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col group/msg`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-brand-blue text-white rounded-br-sm shadow-sm shadow-brand-blue/20"
              : "bg-brand-surface-muted text-brand-navy rounded-bl-sm border border-brand-gray"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.isStreaming && !message.content ? (
            <StreamingIndicator />
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeSanitize, { ...defaultSchema, attributes: { ...defaultSchema.attributes, "*": ["className"] } }]]}
                components={makeCited(message.citations) as Parameters<typeof ReactMarkdown>[0]["components"]}
              >
                {displayContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* AI message actions */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-1 px-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              title={copied ? "Copié !" : "Copier la réponse"}
              className="flex items-center gap-1 text-[10px] text-brand-gray-text hover:text-brand-blue transition-colors px-1.5 py-0.5 rounded hover:bg-brand-gray"
            >
              {copied ? (
                <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              {copied ? "Copié" : "Copier"}
            </button>
            <button
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              title="Bonne réponse"
              className={`p-0.5 rounded transition-colors ${feedback === "up" ? "text-green-500" : "text-brand-gray-text hover:text-green-500"}`}
            >
              <svg className="w-3.5 h-3.5" fill={feedback === "up" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              title="Mauvaise réponse"
              className={`p-0.5 rounded transition-colors ${feedback === "down" ? "text-red-400" : "text-brand-gray-text hover:text-red-400"}`}
            >
              <svg className="w-3.5 h-3.5" fill={feedback === "down" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>
        )}

        {!isUser && message.actualProvider && (
          <p className="text-[10px] text-brand-gray-text px-1 mt-0.5">
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
