import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  onAttach: () => void;
  disabled: boolean;
  value?: string;
  onChange?: (v: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
}

export function MessageInput({
  onSend,
  onAttach,
  disabled,
  value,
  onChange,
  isStreaming = false,
  onStop,
}: Props) {
  const [internalText, setInternalText] = useState("");
  const text = value !== undefined ? value : internalText;
  const setText = onChange !== undefined ? onChange : setInternalText;
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
    <div className="border-t border-brand-gray dark:border-brand-navy-border bg-white dark:bg-brand-navy px-4 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <button
          onClick={onAttach}
          title="Joindre un PDF"
          aria-label="Joindre un PDF"
          className="flex-shrink-0 p-2 rounded-lg text-brand-gray-text dark:text-white/50 hover:text-brand-blue hover:bg-brand-surface-muted dark:hover:bg-brand-navy-light transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
          aria-label="Message"
          className="flex-1 resize-none bg-brand-surface-muted dark:bg-brand-navy-light border border-brand-gray dark:border-brand-navy-border rounded-xl px-4 py-2.5 text-sm text-brand-navy dark:text-white/90 placeholder-brand-gray-text dark:placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:opacity-50 leading-relaxed transition-all"
        />

        {isStreaming && onStop ? (
          <button
            onClick={onStop}
            title="Arrêter la génération"
            aria-label="Arrêter la génération"
            className="flex-shrink-0 p-2.5 rounded-xl bg-brand-navy dark:bg-brand-navy-light hover:opacity-90 transition-opacity shadow-sm"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={disabled || !text.trim()}
            title="Envoyer"
            aria-label="Envoyer le message"
            className="flex-shrink-0 p-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-brand-blue/20"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
