import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import {
  fetchPublicAssistantConfig,
  streamPublicAssistant,
} from "../api/client";
import type {
  PublicAssistantConfig,
  PublicAssistantHistoryTurn,
} from "../api/client";

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHARS = 4000;

function compactHistory(messages: AssistantMessage[]): PublicAssistantHistoryTurn[] {
  const history: PublicAssistantHistoryTurn[] = [];
  let chars = 0;
  for (const message of messages.slice(-MAX_HISTORY_TURNS)) {
    if (message.streaming || !message.content.trim()) continue;
    const content = message.content.trim().slice(0, 1000);
    if (chars + content.length > MAX_HISTORY_CHARS) break;
    history.push({ role: message.role, content });
    chars += content.length;
  }
  return history;
}

function newId() {
  return Math.random().toString(36).slice(2);
}

export function LandingAssistant() {
  const [config, setConfig] = useState<PublicAssistantConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPublicAssistantConfig()
      .then(setConfig)
      .catch(() => setConfig({ enabled: false }));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (!config?.enabled || messages.length > 0 || !config.greeting) return;
    setMessages([{ id: newId(), role: "assistant", content: config.greeting }]);
  }, [config, messages.length]);

  const suggestions = useMemo(
    () => (config?.suggested_questions ?? []).slice(0, 3),
    [config],
  );

  if (!config?.enabled) return null;

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const assistantId = newId();
    const nextMessages: AssistantMessage[] = [
      ...messages,
      { id: newId(), role: "user", content },
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ];
    const history = compactHistory(messages);
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    controllerRef.current = controller;
    let full = "";
    try {
      for await (const event of streamPublicAssistant(content, history, controller.signal)) {
        if (event.type === "token" && event.content) {
          full += event.content;
          const snap = full;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, content: snap } : message,
            ),
          );
        } else if (event.type === "error" && event.content) {
          full = event.content;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, content: event.content ?? "" } : message,
            ),
          );
        }
      }
    } catch (error) {
      full =
        error instanceof Error && error.message
          ? error.message
          : "The assistant is temporarily unavailable.";
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, content: full }
            : message,
        ),
      );
    } finally {
      controllerRef.current = null;
      setStreaming(false);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, content: full || message.content, streaming: false }
            : message,
        ),
      );
    }
  }

  function closePanel() {
    controllerRef.current?.abort();
    setOpen(false);
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Public assistant"
            title="Public assistant"
            className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/85 text-white shadow-2xl backdrop-blur transition-colors hover:border-white/60 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white/70 md:bottom-7 md:right-7 md:h-[72px] md:w-[72px]"
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            whileHover={{ y: -3, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <span className="absolute inset-1 rounded-full border border-white/10" />
            <span className="absolute -right-0.5 top-2 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
            <span className="absolute -right-0.5 top-2 h-3.5 w-3.5 animate-ping rounded-full bg-emerald-300/60" />
            <Bot className="relative h-7 w-7 md:h-8 md:w-8" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            dir="ltr"
            className="fixed bottom-5 right-5 z-50 flex h-[min(620px,calc(100vh-40px))] w-[min(420px,calc(100vw-40px))] flex-col border border-white/20 bg-black text-left text-white shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
          >
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center border border-white/30 bg-white text-black">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em]">ENSET AI</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Public assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] border px-3 py-2 text-left text-[13px] leading-relaxed ${
                      message.role === "user"
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    {message.streaming && !message.content ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {suggestions.length > 0 && messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
                {suggestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void send(question)}
                    className="border border-white/15 px-2.5 py-1.5 text-left text-[10px] leading-snug text-white/70 transition-colors hover:border-white/40 hover:text-white"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex items-end gap-2 border-t border-white/15 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 1000))}
                rows={1}
                disabled={streaming}
                placeholder={config.placeholder || "Ask a question about ENSET AI..."}
                className="max-h-28 min-h-11 flex-1 resize-none border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center bg-white text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                title="Send"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
