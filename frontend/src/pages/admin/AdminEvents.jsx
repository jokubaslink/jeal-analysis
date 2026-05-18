import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle } from "../../components/ui/index.js";

function formatDate(isoDateTime) {
  if (!isoDateTime) return "—";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function qrImageUrl(value) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

export default function AdminEvents() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [eventsLoading, setEventsLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");
  const [pendingVisibilityId, setPendingVisibilityId] = useState("");
  const [checkInQr, setCheckInQr] = useState(null);
  const [pendingQrId, setPendingQrId] = useState("");
  const [attendanceFocus, setAttendanceFocus] = useState(null);
  const [attendancePayload, setAttendancePayload] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

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

  useEffect(() => {
    if (!attendanceFocus || attendanceFocus.kind !== "event") {
      setAttendancePayload(null);
      setAttendanceLoading(false);
      setAttendanceError("");
      return undefined;
    }

    let ignore = false;
    setAttendanceLoading(true);
    setAttendanceError("");
    setAttendancePayload(null);

    (async () => {
      try {
        const data = await apiFetch(`/admin/events/${attendanceFocus.id}/attendance`);
        if (!ignore) setAttendancePayload(data);
      } catch (e) {
        if (!ignore) setAttendanceError(e.message || "Could not load attendance.");
      } finally {
        if (!ignore) setAttendanceLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [attendanceFocus]);

  function toggleEventAttendance(eventItem) {
    setEventsError("");
    setFlashMessage("");
    if (attendanceFocus?.kind === "event" && attendanceFocus.id === eventItem.id) {
      setAttendanceFocus(null);
      return;
    }
    setAttendanceFocus({
      kind: "event",
      id: eventItem.id,
      title: eventItem.title,
    });
  }

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

  async function handleShowCheckInQr(eventItem) {
    setPendingQrId(eventItem.id);
    setEventsError("");
    setFlashMessage("");
    try {
      const payload = await apiFetch(`/admin/events/${eventItem.id}/check-in-token`);
      const checkInUrl = new URL(payload.check_in_path, window.location.origin).toString();
      setCheckInQr({
        title: payload.title,
        checkInUrl,
        qrUrl: qrImageUrl(checkInUrl),
      });
    } catch (e) {
      setEventsError(e.message || "Could not generate check-in QR code.");
    } finally {
      setPendingQrId("");
    }
  }

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (event) =>
        (event.title || "").toLowerCase().includes(q) ||
        (event.category_name || "").toLowerCase().includes(q) ||
        (event.location || "").toLowerCase().includes(q) ||
        (event.description || "").toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  return (
    <Card>
      <CardTitle>All events</CardTitle>
      <CardDescription>Browse every event, edit details, and control whether each event is visible to users.</CardDescription>

      <div className="mt-[length:var(--space-7)] flex flex-wrap items-center justify-between gap-[length:var(--space-4)]">
        <input
          type="search"
          placeholder="Search by title, category, location, or description…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--color-line)] bg-white px-[length:var(--space-4)] py-[length:var(--space-2)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
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

      {checkInQr ? (
        <div className="mt-[length:var(--space-7)] rounded-lg border border-[var(--color-line)] bg-white p-[length:var(--space-5)]">
          <div className="flex flex-wrap items-start gap-[length:var(--space-5)]">
            <img src={checkInQr.qrUrl} alt={`Check-in QR for ${checkInQr.title}`} width="220" height="220" />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-lg font-semibold text-[var(--color-ink)]">{checkInQr.title}</h3>
              <p className="mt-[length:var(--space-2)] break-all text-sm text-[var(--color-ink-subtle)]">
                {checkInQr.checkInUrl}
              </p>
              <div className="mt-[length:var(--space-4)]">
                <Button type="button" variant="secondary" onClick={() => setCheckInQr(null)}>
                  Hide QR
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {attendanceFocus?.kind === "event" ? (
        <div className="mt-[length:var(--space-7)] rounded-lg border border-[var(--color-line)] bg-white p-[length:var(--space-5)]">
          <div className="flex flex-wrap items-start justify-between gap-[length:var(--space-4)]">
            <div>
              <h3 className="m-0 text-lg font-semibold text-[var(--color-ink)]">Attendance · {attendanceFocus.title}</h3>
              <p className="mt-[length:var(--space-2)] m-0 text-sm text-[var(--color-ink-subtle)]">
                QR check-ins recorded for this event (registered users only).
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setAttendanceFocus(null)}>
              Close
            </Button>
          </div>

          {attendanceLoading ? (
            <p className="mt-[length:var(--space-5)] text-sm text-[var(--color-ink-subtle)]">Loading attendance…</p>
          ) : null}

          {attendanceError ? (
            <div className="mt-[length:var(--space-5)]">
              <Alert variant="error">{attendanceError}</Alert>
            </div>
          ) : null}

          {!attendanceLoading && attendancePayload ? (
            <>
              <div className="mt-[length:var(--space-5)] flex flex-wrap gap-[length:var(--space-6)]">
                <div>
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Registered</p>
                  <p className="m-0 mt-1 text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
                    {attendancePayload.registered_count}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Checked in</p>
                  <p className="m-0 mt-1 text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
                    {attendancePayload.checked_in_count}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Check-in rate</p>
                  <p className="m-0 mt-1 text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
                    {attendancePayload.registered_count > 0
                      ? `${Math.round((100 * attendancePayload.checked_in_count) / attendancePayload.registered_count)}%`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-[length:var(--space-7)] overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-line)]">
                      <th className="px-[length:var(--space-2)] py-[length:var(--space-2)] text-left font-semibold">Attendee</th>
                      <th className="px-[length:var(--space-2)] py-[length:var(--space-2)] text-left font-semibold">Email</th>
                      <th className="px-[length:var(--space-2)] py-[length:var(--space-2)] text-left font-semibold">Checked in</th>
                      <th className="px-[length:var(--space-2)] py-[length:var(--space-2)] text-left font-semibold">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendancePayload.attendees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-[length:var(--space-2)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                          No check-ins yet.
                        </td>
                      </tr>
                    ) : (
                      attendancePayload.attendees.map((row) => (
                        <tr key={row.user_id} className="border-b border-[var(--color-line)]">
                          <td className="px-[length:var(--space-2)] py-[length:var(--space-3)]">{row.user_name || "—"}</td>
                          <td className="px-[length:var(--space-2)] py-[length:var(--space-3)] break-all">{row.user_email}</td>
                          <td className="px-[length:var(--space-2)] py-[length:var(--space-3)]">{formatDate(row.checked_in_at)}</td>
                          <td className="px-[length:var(--space-2)] py-[length:var(--space-3)]">{row.check_in_method}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
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

            {!eventsLoading && filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                  {searchQuery.trim()
                    ? `No events match "${searchQuery.trim()}". Try a different title, category, location, or description.`
                    : "No events found."}
                </td>
              </tr>
            ) : null}

            {!eventsLoading
              ? filteredEvents.map((event) => (
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
                        <Button
                          type="button"
                          variant={
                            attendanceFocus?.kind === "event" && attendanceFocus.id === event.id ? "default" : "secondary"
                          }
                          onClick={() => toggleEventAttendance(event)}
                        >
                          {attendanceFocus?.kind === "event" && attendanceFocus.id === event.id ? "Hide attendance" : "Attendance"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pendingQrId === event.id}
                          onClick={() => handleShowCheckInQr(event)}
                        >
                          {pendingQrId === event.id ? "Loading..." : "Check-in QR"}
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
