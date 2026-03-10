import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [usersCount, setUsersCount] = useState(null);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        const users = await apiFetch("/users");
        const cats = await apiFetch("/interest-categories");
        if (!ignore) {
          setUsersCount(Array.isArray(users) ? users.length : 0);
          setCategories(Array.isArray(cats) ? cats : []);
        }
      } catch (error) {
        if (!ignore) setErrorMessage(error.message);
      }
    };
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div>
      <h1 style={{ color: "black" }}>Dashboard</h1>
      <p style={{ color: "black" }}>You are logged in.</p>
      {usersCount !== null ? (
        <p style={{ color: "black" }}>Registered users: {usersCount}</p>
      ) : null}
      {categories.length > 0 ? (
        <div style={{ marginTop: "16px" }}>
          <h2 style={{ color: "black", marginBottom: "8px" }}>Interest categories</h2>
          <ul>
            {categories.map((c) => (
              <li key={c.id} style={{ color: "black" }}>
                <strong>{c.name}</strong>
                {c.description ? ` – ${c.description}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {errorMessage ? <p style={{ color: "#dc2626" }}>{errorMessage}</p> : null}
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