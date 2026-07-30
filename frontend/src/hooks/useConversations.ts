import { useState, useEffect, useCallback } from "react";
import type { Conversation } from "../types";
import { fetchConversations } from "../api/client";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { conversations, loading, refresh };
}
