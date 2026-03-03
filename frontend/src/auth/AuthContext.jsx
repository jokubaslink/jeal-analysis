import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

function readInitialAuth() {
  return localStorage.getItem("demo_authed") === "true";
}

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(readInitialAuth);

  const login = () => {
    localStorage.setItem("demo_authed", "true");
    setIsAuthed(true);
  };

  const logout = () => {
    localStorage.removeItem("demo_authed");
    setIsAuthed(false);
  };

  // Optional: keep tabs/windows in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "demo_authed") setIsAuthed(e.newValue === "true");
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