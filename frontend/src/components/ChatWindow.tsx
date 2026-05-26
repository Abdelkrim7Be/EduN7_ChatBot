import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-brand-surface-muted border border-brand-gray flex items-center justify-center">
          <svg
            className="w-10 h-10 text-brand-blue/60"
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
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-blue/30 border border-brand-blue/20" />
        <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-brand-gold/40 border border-brand-gold/20" />
      </div>

      <div>
        <h3 className="text-brand-navy font-semibold text-base mb-1.5">Posez votre question</h3>
        <p className="text-brand-gray-text text-sm leading-relaxed max-w-xs">
          Sélectionnez un document dans le panneau, puis interrogez son contenu.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {[
          "Résumer ce document",
          "Quels sont les points clés ?",
          "Lister les conclusions",
        ].map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 rounded-full text-xs text-brand-gray-text border border-brand-gray bg-brand-surface-muted"
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
    <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
      {messages.length === 0 && <EmptyState />}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
