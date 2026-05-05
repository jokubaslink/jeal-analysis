import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client.js";
import { Alert, Card, CardDescription, CardTitle } from "../../components/ui/index.js";

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function renderStars(rating) {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

export default function AdminFeedback() {
  const [eventFeedback, setEventFeedback] = useState([]);
  const [clubFeedback, setClubFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setErrorMessage("");

    (async () => {
      try {
        const payload = await apiFetch("/admin/feedback");
        if (ignore) return;
        setEventFeedback(Array.isArray(payload?.event_feedback) ? payload.event_feedback : []);
        setClubFeedback(
          Array.isArray(payload?.club_activity_feedback)
            ? payload.club_activity_feedback
            : []
        );
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message || "Could not load feedback.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Card>
      <CardTitle>Feedback analysis</CardTitle>
      <CardDescription>
        Review ratings and comments from attended events and club activities.
      </CardDescription>

      {errorMessage ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      ) : null}

      <section className="mt-[length:var(--space-10)]">
        <h3 className="m-0 text-lg font-semibold text-[var(--color-ink)]">Event feedback</h3>
        <div className="mt-[length:var(--space-4)] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Event
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  User
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Rating
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Comment
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]"
                  >
                    Loading feedback...
                  </td>
                </tr>
              ) : null}

              {!isLoading && eventFeedback.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]"
                  >
                    No event feedback submitted yet.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? eventFeedback.map((row) => (
                    <tr key={`${row.user_id}-${row.event_id}`} className="border-b border-[var(--color-line)]">
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        <div className="font-medium text-[var(--color-ink)]">{row.event_title}</div>
                        <div className="text-sm text-[var(--color-ink-subtle)]">
                          {formatDate(row.event_start_time)}
                        </div>
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        <div>{row.user_name || "Unnamed user"}</div>
                        <div className="text-sm text-[var(--color-ink-subtle)]">{row.user_email}</div>
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        {renderStars(row.rating)}
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        {row.comment || "—"}
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        {formatDate(row.submitted_at)}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-[length:var(--space-10)]">
        <h3 className="m-0 text-lg font-semibold text-[var(--color-ink)]">Club activity feedback</h3>
        <div className="mt-[length:var(--space-4)] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Club activity
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  User
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Rating
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Comment
                </th>
                <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? null : null}

              {!isLoading && clubFeedback.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]"
                  >
                    No club activity feedback submitted yet.
                  </td>
                </tr>
              ) : null}

              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]"
                  >
                    Loading feedback...
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? clubFeedback.map((row) => (
                    <tr
                      key={`${row.user_id}-${row.club_id}-${row.activity_start_time}`}
                      className="border-b border-[var(--color-line)]"
                    >
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        <div className="font-medium text-[var(--color-ink)]">{row.club_name}</div>
                        <div className="text-sm text-[var(--color-ink-subtle)]">
                          {formatDate(row.activity_start_time)}
                        </div>
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        <div>{row.user_name || "Unnamed user"}</div>
                        <div className="text-sm text-[var(--color-ink-subtle)]">{row.user_email}</div>
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        {renderStars(row.rating)}
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        {row.comment || "—"}
                      </td>
                      <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                        {formatDate(row.submitted_at)}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </Card>
  );
}
