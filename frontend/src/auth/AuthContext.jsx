/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_TOKEN_STORAGE_KEY, getAuthToken, setAuthToken } from "../api/client.js";

const AuthContext = createContext(null);

function readInitialAuth() {
  return !!getAuthToken();
}

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(readInitialAuth);

  const login = (token) => {
    setAuthToken(token);
    setIsAuthed(true);
  };

  const logout = () => {
    setAuthToken(null);
    setIsAuthed(false);
  };

  // Optional: keep tabs/windows in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === AUTH_TOKEN_STORAGE_KEY) {
        setIsAuthed(!!e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ isAuthed, login, logout }), [isAuthed]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}