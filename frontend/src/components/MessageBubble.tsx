import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, RefreshCw, Check, Edit2 } from "lucide-react";
import type { Message } from "../types";
import { useState } from "react";

interface Props {
  msg: Message;
  isLast?: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (id: string, newText: string) => void;
}

export function MessageBubble({
  msg,
  isLast,
  isStreaming,
  onRegenerate,
  onEdit,
}: Props) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.content);

  function handleCopy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSaveEdit() {
    if (onEdit && editVal.trim() !== msg.content) {
      onEdit(msg.id, editVal.trim());
    }
    setIsEditing(false);
  }

  return (
    <div className={`flex gap-4 w-full animate-fade-in group hover-reveal ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-sm shrink-0 flex items-center justify-center font-bold text-[10px] ${
        isUser ? "bg-white text-black" : "bg-surface-bright text-white"
      }`}>
        {isUser ? "USR" : "SYS"}
      </div>

      <div className={`flex-1 min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}>
        {isUser ? (
          <div className="max-w-[85%] text-right">
            {isEditing ? (
              <div className="w-full flex flex-col gap-2 bg-surface-dim border border-border-subtle p-3 rounded-sm">
                <textarea
                  className="w-full bg-transparent text-white outline-none resize-y min-h-[60px] font-mono text-sm"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs text-gray-400 hover:text-white uppercase">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-white text-black rounded-sm uppercase font-bold">Save & Send</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-end group/edit">
                <div className="text-white font-mono text-sm leading-relaxed whitespace-pre-wrap text-left break-words">
                  {msg.content}
                </div>
                <div className="mt-2 flex items-center gap-2 reveal-target">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-gray-500 hover:text-white border border-transparent hover:border-border-subtle rounded-sm transition-all flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono"
                    title="Copy"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="p-1.5 text-gray-500 hover:text-white border border-transparent hover:border-border-subtle rounded-sm transition-all flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-full prose prose-invert prose-pre:bg-[#0e0e0e] prose-pre:border prose-pre:border-border-subtle font-serif leading-relaxed text-gray-200">
            {isLast && isStreaming && msg.content === "" ? (
              <div className="flex items-center gap-1 text-gray-500 mt-2">
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-sm !bg-surface-dim border border-border-subtle text-sm font-mono my-4 overflow-x-auto"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded-sm bg-surface-bright text-white text-[0.85em] font-mono border border-border-subtle" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}

            {/* Actions for bot message */}
            {!isStreaming && (
              <div className="mt-4 flex items-center gap-2 reveal-target">
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-gray-500 hover:text-white border border-transparent hover:border-border-subtle rounded-sm transition-all flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono"
                  title="Copy"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {onRegenerate && isLast && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 text-gray-500 hover:text-white border border-transparent hover:border-border-subtle rounded-sm transition-all flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
