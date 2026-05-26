import { useState, useEffect } from "react";
import { createSession } from "../api/client";

const STORAGE_KEY = "edun7_session_id";

export function useSession() {
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

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
