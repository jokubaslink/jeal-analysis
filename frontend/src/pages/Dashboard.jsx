import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div>
      <h1 style={{ color: "black" }}>Dashboard</h1>
      <p style={{ color: "black" }}>You are logged in.</p>
      <button onClick={handleLogout} style={btn}>Logout</button>
    </div>
  );
}

const btn = {
  padding: "10px 14px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  color: "black",
};