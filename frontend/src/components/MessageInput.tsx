import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  onAttach: () => void;
  disabled: boolean;
}

export function MessageInput({ onSend, onAttach, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="border-t border-brand-gray bg-white px-4 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <button
          onClick={onAttach}
          title="Joindre un PDF"
          className="flex-shrink-0 p-2 rounded-lg text-brand-gray-text hover:text-brand-blue hover:bg-brand-surface-muted transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Posez une question sur vos documents…"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-brand-surface-muted border border-brand-gray rounded-xl px-4 py-2.5 text-sm text-brand-navy placeholder-brand-gray-text outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:opacity-50 leading-relaxed transition-all"
        />

        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          title="Envoyer"
          className="flex-shrink-0 p-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-brand-blue/20"
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
