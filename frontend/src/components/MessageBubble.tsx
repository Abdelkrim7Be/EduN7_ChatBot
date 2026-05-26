import React from "react";
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

  // Append a cursor character at stream position while tokens arrive
  const displayContent = showCursor ? message.content + "▌" : message.content;

  return (
    <div
      className={`flex w-full mb-4 animate-message-in ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        } flex flex-col`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-brand-purple text-white rounded-br-sm"
              : "bg-brand-gray text-gray-100 rounded-bl-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.isStreaming && !message.content ? (
            <StreamingIndicator />
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
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

        {!isUser && message.actualProvider && (
          <p className="text-[10px] text-gray-600 px-1 mt-0.5">
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
