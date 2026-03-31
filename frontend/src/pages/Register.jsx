import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = useMemo(
    () => password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

  const passwordIsLongEnough = password.length >= 8;
  const passwordHasUpper = /[A-Z]/.test(password);
  const passwordHasLower = /[a-z]/.test(password);
  const passwordHasDigit = /\d/.test(password);
  const passwordHasSpecial = /[^A-Za-z0-9]/.test(password);

  const passwordIsComplex =
    passwordIsLongEnough && passwordHasUpper && passwordHasLower && passwordHasDigit && passwordHasSpecial;
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const canSubmit = emailIsValid && passwordIsComplex && confirmPassword && passwordsMatch;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSuccessMessage("");
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          first_name: "",
          last_name: "",
          school: "",
          grade_year: null,
          age_group: "",
          city: "",
        }),
      });
      setSuccessMessage("Registration successful. Redirecting to login...");
      setTimeout(
        () => navigate("/login", { replace: true, state: { from } }),
        1200
      );
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
          <p style={styles.eyebrow}>Get started</p>
          <h2 style={styles.title}>Create your JEAL account</h2>
          <p style={styles.subtitle}>Register to save interests and unlock recommendations.</p>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            style={{
              ...styles.input,
              borderColor:
                email.length === 0 || emailIsValid ? "#d1d5db" : "#dc2626",
            }}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          {email.length > 0 && !emailIsValid ? (
            <span style={styles.inlineError}>Enter a valid email address.</span>
          ) : null}
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
            minLength={8}
            required
          />
          <div style={styles.hintList}>
            <span style={styles.hintItem}>
              {passwordIsLongEnough ? "✓" : "•"} At least 8 characters
            </span>
            <span style={styles.hintItem}>
              {passwordHasUpper ? "✓" : "•"} One uppercase letter
            </span>
            <span style={styles.hintItem}>
              {passwordHasLower ? "✓" : "•"} One lowercase letter
            </span>
            <span style={styles.hintItem}>
              {passwordHasDigit ? "✓" : "•"} One number
            </span>
            <span style={styles.hintItem}>
              {passwordHasSpecial ? "✓" : "•"} One special character
            </span>
          </div>
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
                  ? "#d1d5db"
                  : passwordsMatch
                  ? "#16a34a"
                  : "#dc2626",
            }}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <span style={styles.inlineError}>Passwords do not match.</span>
          )}
        </div>

        {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}
        {successMessage ? <p style={styles.success}>{successMessage}</p> : null}

        <button
          style={{ ...styles.button, opacity: canSubmit && !isSubmitting ? 1 : 0.6 }}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create account"}
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
    minHeight: "70vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    width: "100%",
    maxWidth: "460px",
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
    marginBottom: "6px",
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
    fontWeight: 700,
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
  hint: {
    fontSize: "12px",
    color: "black",
    opacity: 0.6,
  },
  hintList: {
    marginTop: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "12px",
    color: "#1f2937",
    opacity: 0.8,
  },
  hintItem: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
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
  inlineError: {
    fontSize: "12px",
    color: "#b91c1c",
    fontWeight: 700,
  },
  success: {
    margin: 0,
    color: "#166534",
    fontSize: "13px",
    fontWeight: 700,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  button: {
    padding: "12px 16px",
    borderRadius: "999px",
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
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
  },
};
