import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle } from "../../components/ui/index.js";

function formatDate(isoDateTime) {
  if (!isoDateTime) return "—";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function AdminEvents() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState("");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");
  const [pendingVisibilityId, setPendingVisibilityId] = useState("");

  useEffect(() => {
    let ignore = false;
    setEventsLoading(true);
    setEventsError("");

    (async () => {
      try {
        const list = await apiFetch("/admin/events");
        if (!ignore) setEvents(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!ignore) setEventsError(e.message || "Could not load events.");
      } finally {
        if (!ignore) setEventsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setFlashMessage(location.state?.flashMessage || "");
  }, [location.state]);

  async function handleVisibilityChange(eventItem) {
    const nextIsActive = !eventItem.is_active;
    const actionLabel = nextIsActive ? "reactivate" : "mark as inactive";
    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} "${eventItem.title}"?`,
    );

    if (!confirmed) return;

    setPendingVisibilityId(eventItem.id);
    setEventsError("");
    setFlashMessage("");

    try {
      const updatedEvent = await apiFetch(`/admin/events/${eventItem.id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextIsActive }),
      });

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === eventItem.id ? updatedEvent : currentEvent,
        ),
      );
      setFlashMessage(nextIsActive ? "Event reactivated." : "Event marked as inactive.");
    } catch (e) {
      setEventsError(e.message || "Could not update event visibility.");
    } finally {
      setPendingVisibilityId("");
    }
  }

  return (
    <Card>
      <CardTitle>All events</CardTitle>
      <CardDescription>Browse every event, edit details, and control whether each event is visible to users.</CardDescription>

      <div className="mt-[length:var(--space-7)] flex justify-end">
        <Link to="/admin/events/new">
          <Button type="button">Create event</Button>
        </Link>
      </div>

      {eventsError ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="error">{eventsError}</Alert>
        </div>
      ) : null}

      {flashMessage ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="success">{flashMessage}</Alert>
        </div>
      ) : null}

      <div className="mt-[length:var(--space-10)] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Title</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Date</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Status</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventsLoading ? (
              <tr>
                <td colSpan={4} className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                  Loading events...
                </td>
              </tr>
            ) : null}

            {!eventsLoading && events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                  No events found.
                </td>
              </tr>
            ) : null}

            {!eventsLoading
              ? events.map((event) => (
                  <tr key={event.id} className="border-b border-[var(--color-line)]">
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">{event.title}</td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">{formatDate(event.start_time)}</td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                      {event.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                      <div className="flex justify-end gap-[length:var(--space-3)]">
                        <Button
                          type="button"
                          variant={event.is_active ? "secondary" : "default"}
                          disabled={pendingVisibilityId === event.id}
                          onClick={() => handleVisibilityChange(event)}
                        >
                          {pendingVisibilityId === event.id
                            ? "Saving..."
                            : event.is_active
                              ? "Mark inactive"
                              : "Reactivate"}
                        </Button>
                        <Link to={`/admin/events/${event.id}/edit`}>
                          <Button type="button" variant="secondary">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
