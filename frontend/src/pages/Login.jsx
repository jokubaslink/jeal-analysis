import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedFrom = location.state?.from;
  const from = requestedFrom && requestedFrom !== "/" ? requestedFrom : "/results";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const result = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login({
        token: result.token || result.user_id || "session",
        userId: result.user_id,
      });
      navigate(from, { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={{ margin: 0, color: "black" }}>Login</h2>

        <input
          style={styles.input}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}

        <button style={styles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "70vh" },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "30px",
    width: "320px",
    background: "white",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #ccc" },
  button: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    background: "#111",
    color: "white",
    cursor: "pointer",
  },
  error: { margin: 0, color: "#dc2626", fontSize: "14px" },
};
