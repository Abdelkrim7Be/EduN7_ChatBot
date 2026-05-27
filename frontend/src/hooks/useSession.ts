import { useState, useEffect } from "react";
import { createSession } from "../api/client";

const STORAGE_KEY = "ensetai_session_id";

export function useSession(isAuthenticated: boolean) {
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      setLoading(false);
    } else {
      createSession()
        .then((id) => {
          localStorage.setItem(STORAGE_KEY, id);
          setSessionId(id);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated]);

  function resetSession() {
    localStorage.removeItem(STORAGE_KEY);
    createSession()
      .then((id) => {
        localStorage.setItem(STORAGE_KEY, id);
        setSessionId(id);
      })
      .catch(console.error);
  }

  function switchSession(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setSessionId(id);
  }

  return { sessionId, loading, resetSession, switchSession };
}
