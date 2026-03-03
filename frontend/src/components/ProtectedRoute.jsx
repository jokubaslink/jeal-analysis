import { Navigate, useLocation } from "react-router-dom";

// Replace this with real auth logic (token, context, API call, etc.)
function isAuthenticated() {
  return localStorage.getItem("demo_authed") === "true";
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}