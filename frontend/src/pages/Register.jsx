import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = useMemo(
    () => password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

  const canSubmit = email.trim() && password && confirmPassword && passwordsMatch;

  function handleSubmit(e) {
    e.preventDefault();

    // UI-only demo: no backend call yet
    // In a real app, call your API here.
    navigate("/login", { replace: true });
  }

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create account</h2>
          <p style={styles.subtitle}>Register to access JEAL.</p>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            style={styles.input}
            type="email"
            placeholder="you@example.com"
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
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <span style={styles.hint}>At least 6 characters.</span>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            style={{
              ...styles.input,
              borderColor:
                confirmPassword.length === 0
                  ? "#ccc"
                  : passwordsMatch
                  ? "#16a34a"
                  : "#dc2626",
            }}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <span style={styles.error}>Passwords do not match.</span>
          )}
        </div>

        <button style={{ ...styles.button, opacity: canSubmit ? 1 : 0.6 }} disabled={!canSubmit}>
          Create account
        </button>

        <div style={styles.footer}>
          <span style={styles.footerText}>Already have an account?</span>
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={styles.linkButton}
          >
            Log in
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "70vh",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "28px",
    width: "360px",
    background: "white",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "6px",
  },
  title: {
    margin: 0,
    color: "black",
    fontSize: "22px",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    color: "black",
    opacity: 0.7,
    fontSize: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: "black",
    fontSize: "14px",
    fontWeight: 600,
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
    color: "black",
    background: "white",
  },
  hint: {
    fontSize: "12px",
    color: "black",
    opacity: 0.6,
  },
  error: {
    fontSize: "12px",
    color: "#dc2626",
    fontWeight: 600,
  },
  button: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    background: "#111",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
    marginTop: "4px",
  },
  footer: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "6px",
  },
  footerText: {
    color: "black",
    opacity: 0.75,
    fontSize: "14px",
  },
  linkButton: {
    border: "none",
    background: "transparent",
    color: "black",
    cursor: "pointer",
    fontWeight: 700,
    textDecoration: "underline",
    padding: 0,
  },
};