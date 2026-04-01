import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";
import { Alert, Button, Card, Input, Label } from "../components/ui/index.js";

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
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-[420px] gap-[length:var(--space-6)] border-[rgba(15,23,42,0.08)] p-8 shadow-[var(--shadow-card-strong)] backdrop-blur-[8px] [background:radial-gradient(circle_at_top_left,rgba(190,242,100,0.22),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,251,0.98))]">
        <form className="flex flex-col gap-[length:var(--space-6)]" onSubmit={handleSubmit}>
          <div className="mb-1 flex flex-col gap-[length:var(--space-2)]">
            <p className="m-0 text-[length:var(--font-size-caption)] font-bold uppercase tracking-[var(--letter-spacing-ui)] text-[var(--color-brand-green)]">
              Welcome back
            </p>
            <h2 className="m-0 text-[length:var(--font-size-h1)] font-bold leading-none text-[var(--color-ink)]">
              Log in to JEAL
            </h2>
            <p className="m-0 text-[length:var(--font-size-body)] text-[var(--color-ink-muted)]">
              Access your personalized recommendations and profile.
            </p>
          </div>

          <div className="flex flex-col gap-[length:var(--space-2)]">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="flex flex-col gap-[length:var(--space-2)]">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

          <Button type="submit" disabled={isSubmitting} className="mt-1">
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>

          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="m-0 text-[length:var(--font-size-body)] text-[var(--color-ink-muted)]">New to JEAL?</span>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="cursor-pointer border-none bg-transparent p-0 text-[length:var(--font-size-body)] font-bold text-[var(--color-ink)] underline"
            >
              Create an account
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
