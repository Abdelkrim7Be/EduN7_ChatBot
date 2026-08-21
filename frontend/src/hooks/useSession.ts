import { useState, useEffect } from "react";
import { createSession } from "../api/client";

const STORAGE_PREFIX = "ensetai_session_id";

// The session id is scoped per user: on a shared machine, logging in as
// someone else must not resurrect the previous account's conversation
// (the backend rejects it with a 403 and chat becomes unusable).
function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

// StrictMode runs mount effects twice, and a remount can race the first
// request. Share the in-flight promise so one user only ever gets one
// conversation created instead of a pile of empty ones.
const inFlight = new Map<string, Promise<string>>();

function ensureSession(userId: string): Promise<string> {
  const existing = inFlight.get(userId);
  if (existing) return existing;
  const p = createSession()
    .then((id) => {
      localStorage.setItem(storageKey(userId), id);
      return id;
    })
    .finally(() => inFlight.delete(userId));
  inFlight.set(userId, p);
  return p;
}

export function useSession(userId: string | null) {
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSessionId("");
      setLoading(false);
      return;
    }
    // Drop the legacy unscoped key left by older builds.
    localStorage.removeItem(STORAGE_PREFIX);

    const stored = localStorage.getItem(storageKey(userId));
    if (stored) {
      setSessionId(stored);
      setLoading(false);
    } else {
      ensureSession(userId)
        .then(setSessionId)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [userId]);

  function resetSession() {
    if (!userId) return;
    localStorage.removeItem(storageKey(userId));
    ensureSession(userId).then(setSessionId).catch(console.error);
  }

  function switchSession(id: string) {
    if (userId) localStorage.setItem(storageKey(userId), id);
    setSessionId(id);
  }

  return { sessionId, loading, resetSession, switchSession };
}
