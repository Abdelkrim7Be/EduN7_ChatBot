export interface User {
  id: string;
  email: string;
  name: string;
  role: "student" | "professor" | "admin";
  avatar_url?: string;
}

export interface DocumentRecord {
  doc_id: string;
  name: string;
  original_filename: string;
  collection_name: string;
  page_count: number;
  chunk_count: number;
  uploaded_at: string;
  scope?: "private" | "shared";
  category?: string;
  status?:
    | "uploading"
    | "parsing"
    | "chunking"
    | "embedding"
    | "ready"
    | "failed";
  user_id?: string;
}

export interface Citation {
  doc_id: string;
  doc_name: string;
  page_number: number;
  chunk_index: number;
  excerpt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  provider?: string;
  model?: string;
  actualProvider?: string;
  actualModel?: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  actual_provider: string | null;
  actual_model: string | null;
}

export interface Conversation {
  session_id: string;
  title: string;
  doc_ids: string[];
  created_at: number;
  last_active: number;
  preview: string;
  message_count: number;
}

export interface LLMModel {
  id: string;
  name: string;
  description: string;
}

export interface Provider {
  id: string;
  name: string;
  description: string;
  badge: string;
  available: boolean;
  unavailable_reason: string | null;
  models: LLMModel[];
}

export interface SelectedModel {
  provider: string;
  model: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "student" | "professor" | "admin";
  created_at: number;
  last_seen: number;
  conversation_count: number;
  document_count: number;
}

export interface AdminStats {
  user_count: number;
  conversation_count: number;
  message_count: number;
  document_count: number;
  shared_doc_count: number;
}

export interface AdminDocument {
  doc_id: string;
  name: string;
  original_filename: string;
  collection_name: string;
  page_count: number;
  chunk_count: number;
  scope: "private" | "shared";
  category: string;
  uploaded_at: string;
  uploader_name: string;
  uploader_email: string;
}
