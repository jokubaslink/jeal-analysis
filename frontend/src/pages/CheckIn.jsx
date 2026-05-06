import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle, LoadingState } from "../components/ui/index.js";

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

export default function CheckIn() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const targetLink = useMemo(() => {
    if (!result) return "/dashboard";
    return result.type === "club" ? "/clubs" : "/events";
  }, [result]);

  useEffect(() => {
    if (!token) {
      setErrorMessage("This check-in link is missing its QR token.");
      setIsLoading(false);
      return undefined;
    }

    let ignore = false;
    setIsLoading(true);
    setErrorMessage("");

    (async () => {
      try {
        const payload = await apiFetch("/attendance/check-in", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (!ignore) setResult(payload);
      } catch (error) {
        if (!ignore) setErrorMessage(error.message || "Could not complete check-in.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Card>
        <CardTitle>Activity check-in</CardTitle>
        <CardDescription>
          Confirm your attendance before leaving feedback.
        </CardDescription>

        <div className="mt-[length:var(--space-7)]">
          {isLoading ? (
            <LoadingState
              title="Checking you in"
              description="Confirming the QR code with the server."
            />
          ) : errorMessage ? (
            <Alert variant="error">{errorMessage}</Alert>
          ) : result ? (
            <Alert variant="success">
              {result.already_checked_in ? "You were already checked in for " : "Checked in for "}
              {result.title}
              {result.activity_start_time ? ` (${formatDate(result.activity_start_time)})` : ""}.
            </Alert>
          ) : null}
        </div>

        <div className="mt-[length:var(--space-7)] flex gap-[length:var(--space-3)]">
          <Link to={targetLink}>
            <Button type="button">Continue</Button>
          </Link>
          <Link to="/dashboard">
            <Button type="button" variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
