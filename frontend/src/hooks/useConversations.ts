import { useQuery } from "@tanstack/react-query";
import type { Conversation } from "../types";
import { fetchConversations } from "../api/client";

export function useConversations() {
  const { data: conversations = [], isLoading: loading, refetch: refresh } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  return { conversations, loading, refresh };
}
