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
          <h2 style={styles.title}>Create account</h2>
          <p style={styles.subtitle}>Register to access JEAL.</p>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            style={{
              ...styles.input,
              borderColor: email.length === 0 || emailIsValid ? "#ccc" : "#dc2626",
            }}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          {email.length > 0 && !emailIsValid ? (
            <span style={styles.error}>Enter a valid email address.</span>
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
            minLength={8}
            required
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <span style={styles.error}>Passwords do not match.</span>
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
  hintList: {
    marginTop: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "12px",
    color: "black",
    opacity: 0.8,
  },
  hintItem: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  error: {
    fontSize: "12px",
    color: "#dc2626",
    fontWeight: 600,
  },
  success: {
    fontSize: "12px",
    color: "#16a34a",
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
