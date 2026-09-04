import { useState, useCallback, useEffect } from "react";
import type { User } from "../types";
import {
  loginWithEmail,
  registerWithEmail,
  fetchMe,
  logout as logoutApi,
  updateProfile,
} from "../api/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The session cookie is httpOnly, so the only way to know whether we are
    // signed in is to ask the server.
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
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
    const { user: u } = await loginWithEmail(email, password);
    setUser(u);
  }, []);

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const { user: u } = await registerWithEmail(email, name, password);
      setUser(u);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    window.location.href = "/login";
  }, []);

  const updateUser = useCallback(async (name?: string, avatar_url?: string) => {
    const { user: u } = await updateProfile(name, avatar_url);
    setUser(u);
  }, []);

  const isRole = useCallback(
    (...roles: User["role"][]) => !!user && roles.includes(user.role),
    [user],
  );

  const hasPermission = useCallback(
    (permission: string) =>
      !!user && (user.role === "admin" || (user.permissions?.includes(permission) ?? false)),
    [user],
  );

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    isRole,
    hasPermission,
  };
}
