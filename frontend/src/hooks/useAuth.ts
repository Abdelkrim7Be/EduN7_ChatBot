import { useState, useCallback, useEffect } from "react";
import type { User } from "../types";
import { loginWithEmail, registerWithEmail, fetchMe, storeToken, clearToken, hasToken } from "../api/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleExpired() {
      setUser(null);
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await loginWithEmail(email, password);
    storeToken(token);
    setUser(u);
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const { token, user: u } = await registerWithEmail(email, name, password);
    storeToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const isRole = useCallback(
    (...roles: User["role"][]) => !!user && roles.includes(user.role),
    [user]
  );

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    isRole,
  };
}
