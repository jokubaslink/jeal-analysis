/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUTH_TOKEN_STORAGE_KEY, apiFetch, getAuthToken, setAuthToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(() => !!getAuthToken());
  const [userId, setUserId] = useState(() => localStorage.getItem("jeal_user_id"));
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(() => !getAuthToken());

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem("jeal_user_id");
    setUserId(null);
    setIsAuthed(false);
    setIsAdmin(false);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      setAuthReady(true);
      setIsAdmin(false);
      return undefined;
    }

    setAuthReady(false);
    let ignore = false;

    (async () => {
      try {
        const me = await apiFetch("/me");
        if (ignore) return;
        setIsAdmin(!!me.is_admin);
        if (me.id) {
          localStorage.setItem("jeal_user_id", me.id);
          setUserId(me.id);
        }
      } catch {
        if (!ignore) logout();
      } finally {
        if (!ignore) setAuthReady(true);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isAuthed, logout]);

  const login = useCallback(({ token, userId: newUserId } = {}) => {
    setAuthToken(token || "session");
    if (newUserId) {
      localStorage.setItem("jeal_user_id", newUserId);
      setUserId(newUserId);
    }
    setIsAuthed(true);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === AUTH_TOKEN_STORAGE_KEY) {
        setIsAuthed(!!e.newValue);
      }
      if (e.key === "jeal_user_id") {
        setUserId(e.newValue || null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ isAuthed, userId, isAdmin, authReady, login, logout }),
    [isAuthed, userId, isAdmin, authReady, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
