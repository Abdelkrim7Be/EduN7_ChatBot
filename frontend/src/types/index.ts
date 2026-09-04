export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  permissions?: string[];
}

export interface DocumentRecord {
  doc_id: string;
  name: string;
  original_filename: string;
  collection_name: string;
  page_count: number;
  chunk_count: number;
  uploaded_at: number;
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
  role: string;
  created_at: number;
  last_seen: number;
  is_suspended: boolean;
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
  security_status: "pending" | "clean" | "warning" | "blocked" | "failed";
  security_verdict: string;
  security_checked_at: number | null;
  uploaded_at: number;
  uploader_name: string;
  uploader_email: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: number;
}

export interface ExtendedStats {
  totals: {
    total_users: number;
    suspended_users: number;
    total_conversations: number;
    total_messages: number;
    total_documents: number;
    shared_documents: number;
  };
  activity: {
    active_users_today: number;
    messages_today: number;
    messages_this_week: number;
    messages_this_month: number;
    new_users_this_week: number;
    uploads_this_week: number;
  };
  roles_breakdown: Record<string, number>;
  top_users: { name: string; email: string; message_count: number }[];
  daily_messages: { day_offset: number; count: number }[];
  provider_usage: { actual_provider: string; actual_model: string; count: number }[];
  recent_activity: {
    action: string;
    user_email: string;
    target_type: string;
    details: string;
    created_at: number;
  }[];
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_active: boolean;
  created_by: string;
  author_name: string;
  created_at: number;
  expires_at: number | null;
}
