import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import type { Message, Citation, SelectedModel } from "../types";
import { streamChat, fetchConversationMessages } from "../api/client";

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<boolean>(false);

  // Restore messages from DB whenever sessionId changes (covers page refresh + conversation switch)
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    fetchConversationMessages(sessionId)
      .then(({ messages: stored }) => {
        if (cancelled || stored.length === 0) return;
        setMessages(
          stored.map((m) => ({
            id: nanoid(),
            role: m.role,
            content: m.content,
            citations: m.citations ?? undefined,
            actualProvider: m.actual_provider ?? undefined,
            actualModel: m.actual_model ?? undefined,
          }))
        );
      })
      .catch(() => {
        // New conversation or network error — start with empty messages
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const loadMessages = useCallback((msgs: Message[]) => {
    abortRef.current = true;
    setMessages(msgs);
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string, docIds: string[], selectedModel: SelectedModel) => {
      if (!sessionId || isStreaming) return;

      const userMsg: Message = {
        id: nanoid(),
        role: "user",
        content: text,
      };
      const assistantId = nanoid();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
        provider: selectedModel.provider,
        model: selectedModel.model,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      abortRef.current = false;

      try {
        const gen = streamChat(
          sessionId,
          text,
          docIds,
          selectedModel.provider,
          selectedModel.model,
        );
        let fullContent = "";
        let citations: Citation[] | undefined;
        let actualProvider: string | undefined;
        let actualModel: string | undefined;

        for await (const event of gen) {
          if (abortRef.current) break;

          if (event.type === "token" && event.content) {
            fullContent += event.content;
            const snap = fullContent;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: snap } : m
              )
            );
          } else if (event.type === "citations") {
            citations = event.citations;
          } else if (event.type === "provider_used") {
            actualProvider = event.provider;
            actualModel = event.model;
          } else if (event.type === "error" && event.content) {
            fullContent = `⚠️ ${event.content}`;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: fullContent } : m
              )
            );
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, citations, isStreaming: false, actualProvider, actualModel }
              : m
          )
        );
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "An error occurred";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${errMsg}`, isStreaming: false }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming]
  );

  const clearMessages = useCallback(() => {
    abortRef.current = true;
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages, loadMessages };
}
