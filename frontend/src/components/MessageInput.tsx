import { useRef, useEffect } from "react";
import type { ComponentType, RefObject } from "react";
import { Send, Square, Paperclip } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  onAttach: () => void;
  disabled?: boolean;
  value: string;
  onChange: (v: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  focusRef?: RefObject<HTMLTextAreaElement | null>;
  suggestions?: { label: string; prompt: string; icon?: ComponentType<{ className?: string }> }[];
  onSuggestion?: (prompt: string) => void;
}

export function MessageInput({
  onSend,
  onAttach,
  disabled,
  value,
  onChange,
  isStreaming,
  onStop,
  focusRef,
  suggestions,
  onSuggestion,
}: Props) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = focusRef || internalRef;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [value, textareaRef]);

  function handleSend() {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      onChange("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }

  return (
    <div className="px-4 pt-4 pb-6 lg:pb-8 bg-transparent border-t border-border-subtle shrink-0">
      <div className="max-w-4xl mx-auto relative">
        {suggestions && suggestions.length > 0 && onSuggestion && !value && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-gray-400 bg-surface-dim border border-border-subtle rounded-full hover:bg-surface-bright hover:text-white hover:border-gray-500 transition-all"
              >
                {s.icon && <s.icon className="w-3.5 h-3.5" />}
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="border border-border-heavy bg-surface-dim rounded-sm focus-within:border-white transition-colors flex items-end">
          <button
            onClick={onAttach}
            type="button"
            className="p-3 text-gray-500 hover:text-white transition-colors shrink-0"
            title="Joindre un fichier"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Saisissez votre question ici..."
            className="flex-1 max-h-[200px] bg-transparent text-white placeholder-gray-600 outline-none resize-none py-3 px-2 font-mono text-sm min-h-[44px]"
            rows={1}
            disabled={disabled && !isStreaming}
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="p-3 text-white hover:text-red-400 transition-colors shrink-0"
              title="Arrêter"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              className="p-3 text-gray-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              title="Envoyer"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="text-center mt-2 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
          Une IA peut générer des informations inexactes. Vérifiez les réponses importantes.
        </div>
      </div>
    </div>
  );
}
