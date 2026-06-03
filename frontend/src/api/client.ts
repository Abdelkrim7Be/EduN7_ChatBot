import type {
  DocumentRecord,
  Provider,
  Conversation,
  StoredMessage,
  User,
  AdminUser,
  AdminStats,
  AdminDocument,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "ensetai_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      ...authHeaders(),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("auth:expired"));
  }
  return res;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error ?? "Login failed");
  }
  return res.json();
}

export async function registerWithEmail(
  email: string,
  name: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Registration failed" }));
    throw new Error(err.error ?? "Registration failed");
  }
  return res.json();
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) throw new Error("Not authenticated");
  const data = await res.json();
  return data.user as User;
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return !!getToken();
}

export async function createSession(): Promise<string> {
  const res = await apiFetch("/api/sessions", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create session");
  const data = await res.json();
  return data.session_id as string;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
}

export async function uploadDocuments(
  files: File[],
  sessionId: string,
  scope: "private" | "shared" = "private",
): Promise<DocumentRecord[]> {
  const form = new FormData();
  files.forEach((f) => form.append("files[]", f));
  form.append("session_id", sessionId);
  form.append("scope", scope);

  // don't set Content-Type — browser sets the multipart boundary automatically
  const res = await apiFetch("/api/documents/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }
  const data = await res.json();
  return data.documents as DocumentRecord[];
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const res = await apiFetch("/api/documents");
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return data.documents as DocumentRecord[];
}

export interface DocumentStatus {
  doc_id: string;
  status:
    | "uploading"
    | "parsing"
    | "chunking"
    | "embedding"
    | "ready"
    | "failed";
  error_message: string | null;
  page_count: number;
  chunk_count: number;
}

export async function fetchDocumentStatus(
  docId: string,
): Promise<DocumentStatus> {
  const res = await apiFetch(`/api/documents/${docId}/status`);
  if (!res.ok) throw new Error("Status check failed");
  return res.json() as Promise<DocumentStatus>;
}

export interface DocumentPreview {
  page: number;
  total_pages: number;
  text: string;
}

export async function fetchDocumentPreview(
  docId: string,
  page: number,
): Promise<DocumentPreview> {
  const res = await apiFetch(`/api/documents/${docId}/preview?page=${page}`);
  if (!res.ok) throw new Error("Preview not available");
  return res.json() as Promise<DocumentPreview>;
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await apiFetch(`/api/documents/${docId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function fetchProviders(): Promise<Provider[]> {
  const res = await apiFetch("/api/providers");
  if (!res.ok) throw new Error("Failed to fetch providers");
  const data = await res.json();
  return data.providers as Provider[];
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await apiFetch("/api/conversations");
  if (!res.ok) throw new Error("Failed to fetch conversations");
  const data = await res.json();
  return data.conversations as Conversation[];
}

export async function fetchConversationMessages(
  sessionId: string,
): Promise<{ conversation: Conversation; messages: StoredMessage[] }> {
  const res = await apiFetch(`/api/conversations/${sessionId}`);
  if (!res.ok) throw new Error("Conversation not found");
  return res.json();
}

export async function updateConversationTitle(
  sessionId: string,
  title: string,
): Promise<void> {
  await apiFetch(`/api/conversations/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversationApi(sessionId: string): Promise<void> {
  await apiFetch(`/api/conversations/${sessionId}`, { method: "DELETE" });
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await apiFetch("/api/admin/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  const data = await res.json();
  return data.users as AdminUser[];
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("Failed to update role");
}

export async function fetchAdminDocuments(
  scope?: "all" | "shared" | "private",
): Promise<AdminDocument[]> {
  const qs = scope ? `?scope=${scope}` : "";
  const res = await apiFetch(`/api/admin/documents${qs}`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return data.documents as AdminDocument[];
}

export async function deleteAdminDocument(docId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await apiFetch("/api/admin/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json() as Promise<AdminStats>;
}

export interface AdminConversation {
  session_id: string;
  title: string;
  created_at: number;
  last_active: number;
  user_id: string;
  user_name: string;
  user_email: string;
  message_count: number;
  last_message: string;
}

export interface AdminConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function fetchAdminConversations(
  search?: string,
): Promise<AdminConversation[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await apiFetch(`/api/admin/conversations${qs}`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  const data = await res.json();
  return data.conversations as AdminConversation[];
}

export async function fetchAdminConversationMessages(
  sessionId: string,
): Promise<{
  conversation: { title: string };
  messages: AdminConversationMessage[];
}> {
  const res = await apiFetch(`/api/admin/conversations/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function deleteAdminConversation(
  sessionId: string,
): Promise<void> {
  const res = await apiFetch(`/api/admin/conversations/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export interface Setting {
  key: string;
  value: string;
  label: string;
  description: string;
  kind: "text" | "number" | "boolean";
  updated_at: number | null;
  updated_by: string | null;
}

export async function fetchSettings(): Promise<Setting[]> {
  const res = await apiFetch("/api/admin/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  const data = await res.json();
  return data.settings as Setting[];
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const res = await apiFetch(`/api/admin/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Failed to update setting");
}

export interface StreamEvent {
  type:
    | "token"
    | "citations"
    | "done"
    | "error"
    | "heartbeat"
    | "provider_used";
  content?: string;
  citations?: import("../types").Citation[];
  provider?: string;
  model?: string;
}

export async function* streamChat(
  sessionId: string,
  message: string,
  docIds: string[],
  provider: string,
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      doc_ids: docIds,
      provider,
      model,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const json = line.slice(6).trim();
        if (!json) continue;
        try {
          yield JSON.parse(json) as StreamEvent;
        } catch {
          // skip malformed
        }
      }
    }
  }
}
