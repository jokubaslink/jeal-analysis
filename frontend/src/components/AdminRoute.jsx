import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { LoadingState } from "./ui/index.js";

const loadingBox = {
  minHeight: "40vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function AdminRoute({ children }) {
  const { isAdmin, authReady } = useAuth();

  if (!authReady) {
    return (
      <div style={loadingBox}>
        <LoadingState
          title="Checking access"
          description="Verifying your admin permissions."
          className="mx-auto max-w-[420px]"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
