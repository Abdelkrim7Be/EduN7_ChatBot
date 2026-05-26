import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
      {/* Illustration */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-brand-surface border border-brand-gray flex items-center justify-center">
          <svg
            className="w-10 h-10 text-brand-purple/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        {/* Decorative dots */}
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-purple/40 border border-brand-purple/20" />
        <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-500/30 border border-cyan-500/20" />
      </div>

      <div>
        <h3 className="text-white font-semibold text-base mb-1.5">Ask anything</h3>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
          Select a document from the sidebar, then ask any question about its content.
        </p>
      </div>

      {/* Suggestion pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {[
          "Summarize this document",
          "What are the main topics?",
          "List key conclusions",
        ].map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-brand-gray bg-brand-surface/50"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChatWindow({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && <EmptyState />}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
