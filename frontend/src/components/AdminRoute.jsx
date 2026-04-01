import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const loadingBox = {
  minHeight: "40vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#4b5563",
  fontSize: "14px",
  fontWeight: 600,
};

export default function AdminRoute({ children }) {
  const { isAdmin, authReady } = useAuth();

  if (!authReady) {
    return <div style={loadingBox}>Checking access…</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
