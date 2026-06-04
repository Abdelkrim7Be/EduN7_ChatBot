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

  const canSend = !disabled && !!text.trim();

  return (
    <div className="border-t border-brand-gray dark:border-brand-navy-border bg-white dark:bg-brand-navy px-4 py-3">
      {/* Outer shell — double-bezel */}
      <div className="max-w-4xl mx-auto">
        <div className="p-1 rounded-2xl bg-brand-surface-muted dark:bg-brand-navy-light border border-brand-gray dark:border-brand-navy-border shadow-soft focus-within:border-brand-blue/50 dark:focus-within:border-brand-blue/40 focus-within:shadow-glow transition-all duration-200">
          {/* Inner row */}
          <div className="flex items-end gap-1 px-1">
            <button
              onClick={onAttach}
              title="Joindre un PDF"
              aria-label="Joindre un PDF"
              className="flex-shrink-0 p-2 rounded-xl text-brand-gray-text dark:text-white/40 hover:text-brand-blue dark:hover:text-brand-blue-light hover:bg-white dark:hover:bg-brand-navy transition-colors"
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
              className="flex-1 resize-none bg-transparent text-sm text-brand-navy dark:text-white/90 placeholder-brand-gray-text dark:placeholder-white/30 outline-none py-2.5 leading-relaxed disabled:opacity-50"
            />

            {isStreaming && onStop ? (
              <button
                onClick={onStop}
                title="Arrêter la génération"
                aria-label="Arrêter la génération"
                className="flex-shrink-0 mb-0.5 p-2 rounded-xl bg-brand-navy dark:bg-white/10 hover:opacity-80 active:scale-95 transition-all"
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
                disabled={!canSend}
                title="Envoyer"
                aria-label="Envoyer le message"
                className="flex-shrink-0 mb-0.5 p-2 rounded-xl bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm shadow-brand-blue/25"
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

        <p className="text-center text-[10px] text-brand-gray-text/60 dark:text-white/20 mt-1.5">
          Entrée pour envoyer · Maj+Entrée pour un saut de ligne
        </p>
      </div>
    </div>
  );
}
