import { useState, useRef, type KeyboardEvent, type RefObject } from "react";

interface Props {
  onSend: (text: string) => void;
  onAttach: () => void;
  disabled: boolean;
  value?: string;
  onChange?: (v: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  focusRef?: RefObject<HTMLTextAreaElement | null>;
}

export function MessageInput({
  onSend,
  onAttach,
  disabled,
  value,
  onChange,
  isStreaming = false,
  onStop,
  focusRef,
}: Props) {
  const [internalText, setInternalText] = useState("");
  const text = value !== undefined ? value : internalText;
  const setText = onChange !== undefined ? onChange : setInternalText;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = focusRef ?? textareaRef;

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
    if (resolvedRef.current) {
      resolvedRef.current.style.height = "auto";
    }
  }

  function handleInput() {
    const el = resolvedRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const canSend = !disabled && !!text.trim();

  return (
    <div className="border-t border-hairline bg-canvas px-4 py-3">
      {/* Floating glass capsule */}
      <div className="max-w-4xl mx-auto">
        <div className="p-1 rounded-2xl glass border border-hairline shadow-soft focus-within:border-accent/50 focus-within:shadow-glow transition-all duration-200">
          {/* Inner row */}
          <div className="flex items-end gap-1 px-1">
            <button
              onClick={onAttach}
              title="Joindre un PDF"
              aria-label="Joindre un PDF"
              className="flex-shrink-0 p-2 rounded-xl text-fg-muted hover:text-accent hover:bg-surface-3 transition-colors"
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
              ref={resolvedRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Posez une question sur vos documents…"
              disabled={disabled}
              rows={1}
              aria-label="Message"
              className="flex-1 resize-none bg-transparent text-sm text-fg placeholder-fg-muted outline-none py-2.5 leading-relaxed disabled:opacity-50"
            />

            {isStreaming && onStop ? (
              <button
                onClick={onStop}
                title="Arrêter la génération"
                aria-label="Arrêter la génération"
                className="flex-shrink-0 mb-0.5 p-2 rounded-xl bg-surface-3 text-fg hover:bg-surface-3/70 active:scale-95 transition-all"
              >
                <svg
                  className="w-4 h-4"
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
                className="flex-shrink-0 mb-0.5 p-2 rounded-xl bg-accent text-accent-contrast hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shadow-glow"
              >
                <svg
                  className="w-4 h-4"
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

        <p className="text-center text-[10px] text-fg-muted mt-1.5">
          Entrée pour envoyer · Maj+Entrée pour un saut de ligne ·{" "}
          <kbd className="font-mono">⌘K</kbd> Palette
        </p>
      </div>
    </div>
  );
}
