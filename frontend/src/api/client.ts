import type {
  DocumentRecord,
  Provider,
  Conversation,
  StoredMessage,
  User,
  AdminUser,
  AdminStats,
  AdminDocument,
  AuditLogEntry,
  ExtendedStats,
  PlatformHealth,
  Announcement,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "";
const CSRF_COOKIE = "ensetai_csrf";

// The session token lives in an httpOnly cookie the page cannot read, so the
// browser attaches it automatically. Non-GET requests echo the readable CSRF
// cookie back in a header, which a cross-origin page cannot do.
function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function csrfHeaders(method?: string): Record<string, string> {
  const verb = (method ?? "GET").toUpperCase();
  if (verb === "GET" || verb === "HEAD") return {};
  const token = readCookie(CSRF_COOKIE);
  return token ? { "X-CSRF-Token": token } : {};
}

async function apiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers as Record<string, string>),
      ...csrfHeaders(init.method),
    },
  });
  if (res.status === 401) {
    window.dispatchEvent(new Event("auth:expired"));
  }
  return res;
}

async function readApiError(res: Response, fallback: string): Promise<Error> {
  const data = await res.json().catch(() => null);
  return new Error(data?.error ?? fallback);
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<{ user: User }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    credentials: "include",
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
): Promise<{ user: User }> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    credentials: "include",
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

export async function updateProfile(name?: string, avatar_url?: string): Promise<{ user: User }> {
  const res = await apiFetch("/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, avatar_url }),
  });
  if (!res.ok) throw await readApiError(res, "Failed to update profile");
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch('/api/auth/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to change password' }));
    throw new Error(data.error || 'Failed to change password');
  }
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
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

export async function fetchDocumentFile(docId: string): Promise<string> {
  const res = await apiFetch(`/api/documents/${docId}/file`);
  if (!res.ok) throw new Error("File not available");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
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
  const res = await apiFetch(`/api/conversations/${sessionId}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Failed to delete conversation: ${res.status} ${res.statusText}`);
  }
}

export async function fetchAdminUsers(params?: {
  limit?: number;
  offset?: number;
  role?: string;
  search?: string;
  status?: "all" | "active" | "suspended";
}): Promise<{
  users: AdminUser[];
  total: number;
  role_counts: Record<string, number>;
  status_counts: { all: number; active: number; suspended: number };
}> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.role) qs.set("role", params.role);
  if (params?.search) qs.set("search", params.search);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  const res = await apiFetch(`/api/admin/users?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  const data = await res.json();
  return {
    users: data.users as AdminUser[],
    total: data.total as number,
    role_counts: data.role_counts ?? {},
    status_counts: data.status_counts ?? { all: data.total as number, active: 0, suspended: 0 },
  };
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
  params?: { limit?: number; offset?: number; search?: string },
): Promise<{
  documents: AdminDocument[];
  total: number;
  scope_counts: { all: number; shared: number; private: number };
}> {
  const qs = new URLSearchParams();
  if (scope) qs.set("scope", scope);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.search) qs.set("search", params.search);
  const res = await apiFetch(`/api/admin/documents?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return {
    documents: data.documents as AdminDocument[],
    total: data.total as number,
    scope_counts: data.scope_counts ?? {
      all: data.total as number,
      shared: 0,
      private: 0,
    },
  };
}

export async function fetchAdminDocumentFile(docId: string): Promise<string> {
  const res = await apiFetch(`/api/admin/documents/${docId}/file`);
  if (!res.ok) throw new Error("File not available");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
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
  params?: { limit?: number; offset?: number },
): Promise<{ conversations: AdminConversation[]; total: number }> {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await apiFetch(`/api/admin/conversations?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  const data = await res.json();
  return {
    conversations: data.conversations as AdminConversation[],
    total: data.total as number,
  };
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
  kind: "text" | "textarea" | "number" | "boolean" | "select";
  updated_at: number | null;
  updated_by: string | null;
}

export interface PublicAssistantModelOption {
  provider: string;
  model: string;
  label: string;
  available: boolean;
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

export async function fetchPublicAssistantModelOptions(): Promise<PublicAssistantModelOption[]> {
  const res = await apiFetch("/api/admin/public-assistant/model-options");
  if (!res.ok) throw new Error("Failed to fetch public assistant model options");
  const data = await res.json();
  return data.options as PublicAssistantModelOption[];
}

export interface PublicAssistantConfig {
  enabled: boolean;
  greeting?: string;
  placeholder?: string;
  suggested_questions?: string[];
}

export interface PublicAssistantHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export async function fetchPublicAssistantConfig(): Promise<PublicAssistantConfig> {
  const res = await fetch(`${BASE}/api/public-assistant/config`, {
    credentials: "include",
  });
  if (!res.ok) return { enabled: false };
  return res.json() as Promise<PublicAssistantConfig>;
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
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders("POST"),
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

export async function* streamPublicAssistant(
  message: string,
  history: PublicAssistantHistoryTurn[],
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${BASE}/api/public-assistant/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Assistant request failed: ${res.status}`);
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
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;
      try {
        yield JSON.parse(json) as StreamEvent;
      } catch {
        // ignore malformed stream events
      }
    }
  }
}

async function* streamEvents(res: Response): AsyncGenerator<StreamEvent> {
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Stream request failed: ${res.status}`);
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
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;
      try {
        yield JSON.parse(json) as StreamEvent;
      } catch {
        // ignore malformed stream events
      }
    }
  }
}

export async function* previewPublicAssistant(
  message: string,
  settings: Record<string, string>,
  history: PublicAssistantHistoryTurn[] = [],
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${BASE}/api/admin/public-assistant/preview`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders("POST"),
    },
    body: JSON.stringify({ message, settings, history }),
    signal,
  });

  yield* streamEvents(res);
}

export interface AdminRole {
  name: string;
  description: string;
  is_builtin: boolean;
  user_count: number;
  created_at: number;
  permissions: string[];
}

export interface AdminPermission {
  key: string;
  label: string;
  description: string;
  category: string;
}

export async function fetchAdminRoles(): Promise<{
  roles: AdminRole[];
  permissions: AdminPermission[];
}> {
  const res = await apiFetch("/api/admin/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  const data = await res.json();
  return {
    roles: data.roles as AdminRole[],
    permissions: data.permissions as AdminPermission[],
  };
}

export async function createAdminRole(
  name: string,
  description: string,
  permissions: string[] = [],
): Promise<void> {
  const res = await apiFetch("/api/admin/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, permissions }),
  });
  if (!res.ok) throw await readApiError(res, "Failed to create role");
}

export async function updateAdminRolePermissions(
  roleName: string,
  permissions: string[],
): Promise<string[]> {
  const res = await apiFetch(
    `/api/admin/roles/${encodeURIComponent(roleName)}/permissions`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    },
  );
  if (!res.ok) throw new Error("Failed to update role permissions");
  const data = await res.json();
  return data.permissions as string[];
}

export async function deleteAdminRole(roleName: string): Promise<void> {
  const res = await apiFetch(`/api/admin/roles/${encodeURIComponent(roleName)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete role");
}

// ─── Extended Stats ──────────────────────────────────────────────────────────

export async function fetchExtendedStats(): Promise<ExtendedStats> {
  const res = await apiFetch("/api/admin/stats/extended");
  if (!res.ok) throw new Error("Failed to fetch extended stats");
  return res.json() as Promise<ExtendedStats>;
}

export async function fetchPlatformHealth(): Promise<PlatformHealth> {
  const res = await apiFetch("/api/admin/platform-health");
  if (!res.ok) throw new Error("Failed to fetch platform health");
  return res.json() as Promise<PlatformHealth>;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export async function fetchAuditLog(params?: {
  user_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.user_id) qs.set("user_id", params.user_id);
  if (params?.action) qs.set("action", params.action);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await apiFetch(`/api/admin/audit-log?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

// ─── User Suspension ─────────────────────────────────────────────────────────

export async function suspendUser(userId: string, suspended: boolean): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${userId}/suspend`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suspended }),
  });
  if (!res.ok) throw new Error("Failed to update user suspension");
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete user");
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await apiFetch("/api/admin/announcements");
  if (!res.ok) throw new Error("Failed to fetch announcements");
  const data = await res.json();
  return data.announcements as Announcement[];
}

export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const res = await apiFetch("/api/announcements/active");
  if (!res.ok) throw new Error("Failed to fetch announcements");
  const data = await res.json();
  return data.announcements as Announcement[];
}

export async function createAnnouncement(data: {
  title: string;
  content: string;
  type: string;
  expires_at?: number;
}): Promise<void> {
  const res = await apiFetch("/api/admin/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create announcement");
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete announcement");
}

export async function toggleAnnouncement(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/announcements/${id}/toggle`, { method: "PUT" });
  if (!res.ok) throw new Error("Failed to toggle announcement");
}
