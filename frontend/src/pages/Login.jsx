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
        <div style={styles.header}>
          <p style={styles.eyebrow}>Welcome back</p>
          <h2 style={styles.title}>Log in to JEAL</h2>
          <p style={styles.subtitle}>Access your personalized recommendations and profile.</p>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            style={styles.input}
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            style={styles.input}
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}

        <button
          style={{
            ...styles.button,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? "default" : "pointer",
          }}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>

        <div style={styles.footer}>
          <span style={styles.footerText}>New to JEAL?</span>
          <button type="button" onClick={() => navigate("/register")} style={styles.linkButton}>
            Create an account
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    width: "100%",
    maxWidth: "420px",
    padding: "30px",
    borderRadius: "24px",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background:
      "radial-gradient(circle at top left, rgba(190, 242, 100, 0.22), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249, 250, 251, 0.98) 100%)",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.1)",
    backdropFilter: "blur(8px)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "4px",
  },
  eyebrow: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#3f6212",
  },
  title: {
    margin: 0,
    color: "#111827",
    fontSize: "30px",
    lineHeight: 1,
  },
  subtitle: {
    margin: 0,
    color: "#4b5563",
    fontSize: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: "#111827",
    fontSize: "13px",
    fontWeight: 700,
  },
  input: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    outline: "none",
    color: "#111827",
    background: "rgba(255, 255, 255, 0.92)",
    fontSize: "14px",
  },
  button: {
    marginTop: "4px",
    padding: "12px 16px",
    borderRadius: "999px",
    border: "none",
    background: "#111827",
    color: "white",
    fontWeight: 700,
    fontSize: "14px",
  },
  error: {
    margin: 0,
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: 700,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    marginTop: "4px",
  },
  footerText: {
    margin: 0,
    color: "#4b5563",
    fontSize: "14px",
  },
  linkButton: {
    border: "none",
    background: "transparent",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700,
    textDecoration: "underline",
    padding: 0,
    fontSize: "14px",
  },
};
