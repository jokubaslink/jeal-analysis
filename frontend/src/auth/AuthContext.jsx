import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setAuthToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(() => !!localStorage.getItem("jeal_auth_token"));

  const login = (token) => {
    setAuthToken(token || "session");
    setIsAuthed(true);
  };

  const logout = () => {
    setAuthToken(null);
    setIsAuthed(false);
  };

  // Optional: keep tabs/windows in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "jeal_auth_token") setIsAuthed(!!e.newValue);
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