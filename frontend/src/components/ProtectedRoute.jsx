import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { getAuthToken } from "../api/client.js";

export default function ProtectedRoute({ children }) {
  const { isAuthed } = useAuth();
  const location = useLocation();
  const hasToken = !!getAuthToken();

  if (!isAuthed || !hasToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}