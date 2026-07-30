import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import type { Message, Citation, SelectedModel } from "../types";
import { streamChat, fetchConversationMessages } from "../api/client";

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // Holds the in-flight request so stop()/regenerate() can cancel the stream.
  const controllerRef = useRef<AbortController | null>(null);
  // Remember the docs used for the latest turn so regenerate reuses them.
  const lastDocIdsRef = useRef<string[]>([]);

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
          })),
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
    controllerRef.current?.abort();
    setMessages(msgs);
    setIsStreaming(false);
  }, []);

  // Streams a response into an existing assistant placeholder message.
  const streamInto = useCallback(
    async (
      assistantId: string,
      text: string,
      docIds: string[],
      selectedModel: SelectedModel,
    ) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      lastDocIdsRef.current = docIds;
      setIsStreaming(true);

      let fullContent = "";
      let citations: Citation[] | undefined;
      let actualProvider: string | undefined;
      let actualModel: string | undefined;

      try {
        const gen = streamChat(
          sessionId,
          text,
          docIds,
          selectedModel.provider,
          selectedModel.model,
          controller.signal,
        );

        for await (const event of gen) {
          if (event.type === "token" && event.content) {
            fullContent += event.content;
            const snap = fullContent;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: snap } : m,
              ),
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
                m.id === assistantId ? { ...m, content: fullContent } : m,
              ),
            );
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullContent,
                  citations,
                  isStreaming: false,
                  actualProvider,
                  actualModel,
                }
              : m,
          ),
        );
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  // Keep partial content on manual stop; show error otherwise.
                  content: aborted
                    ? fullContent || "_(Réponse interrompue)_"
                    : `Error: ${e instanceof Error ? e.message : "An error occurred"}`,
                  citations,
                  isStreaming: false,
                  actualProvider,
                  actualModel,
                }
              : m,
          ),
        );
      } finally {
        controllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [sessionId],
  );

  const sendMessage = useCallback(
    async (text: string, docIds: string[], selectedModel: SelectedModel) => {
      if (!sessionId || isStreaming) return;

      const userMsg: Message = { id: nanoid(), role: "user", content: text };
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
      await streamInto(assistantId, text, docIds, selectedModel);
    },
    [sessionId, isStreaming, streamInto],
  );

  // Re-runs the most recent user turn, replacing the last assistant reply.
  const regenerate = useCallback(
    async (selectedModel: SelectedModel) => {
      if (!sessionId || isStreaming) return;

      let lastUserText = "";
      setMessages((prev) => {
        // Find the last user message; drop everything after it.
        const lastUserIdx = [...prev]
          .reverse()
          .findIndex((m) => m.role === "user");
        if (lastUserIdx === -1) return prev;
        const idx = prev.length - 1 - lastUserIdx;
        lastUserText = prev[idx].content;
        const assistantId = nanoid();
        const trimmed = prev.slice(0, idx + 1);
        return [
          ...trimmed,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            isStreaming: true,
            provider: selectedModel.provider,
            model: selectedModel.model,
          },
        ];
      });

      // The assistant placeholder is always last; resolve its id after state set.
      if (!lastUserText) return;
      setTimeout(() => {
        setMessages((cur) => {
          const last = cur[cur.length - 1];
          if (last && last.role === "assistant" && last.isStreaming) {
            void streamInto(
              last.id,
              lastUserText,
              lastDocIdsRef.current,
              selectedModel,
            );
          }
          return cur;
        });
      }, 0);
    },
    [sessionId, isStreaming, streamInto],
  );

  // Edits a past user message and re-runs the conversation from that point.
  const editMessage = useCallback(
    async (
      messageId: string,
      newText: string,
      docIds: string[],
      selectedModel: SelectedModel,
    ) => {
      if (!sessionId || isStreaming) return;
      const trimmed = newText.trim();
      if (!trimmed) return;

      const assistantId = nanoid();
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === messageId);
        if (idx === -1) return prev;
        const head = prev.slice(0, idx);
        return [
          ...head,
          { ...prev[idx], content: trimmed },
          {
            id: assistantId,
            role: "assistant",
            content: "",
            isStreaming: true,
            provider: selectedModel.provider,
            model: selectedModel.model,
          },
        ];
      });
      await streamInto(assistantId, trimmed, docIds, selectedModel);
    },
    [sessionId, isStreaming, streamInto],
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    controllerRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    regenerate,
    editMessage,
    stop,
    clearMessages,
    loadMessages,
  };
}
