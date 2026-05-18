import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api/client.js";
import AttendanceOverviewChart from "../../components/admin/AttendanceOverviewChart.jsx";
import { Alert, Button, Card, CardDescription, CardTitle, Label, LoadingState, Select } from "../../components/ui/index.js";

export default function AdminHome() {
  const [days, setDays] = useState(30);
  const [clubFilterId, setClubFilterId] = useState("");
  const [eventFilterId, setEventFilterId] = useState("");
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [chartMode, setChartMode] = useState("lines");
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  useEffect(() => {
    let ignore = false;
    setClubsLoading(true);

    (async () => {
      try {
        const list = await apiFetch("/admin/clubs");
        if (!ignore) setClubs(Array.isArray(list) ? list : []);
      } catch {
        if (!ignore) setClubs([]);
      } finally {
        if (!ignore) setClubsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setEventsLoading(true);

    (async () => {
      try {
        const list = await apiFetch("/admin/events");
        if (!ignore) setEvents(Array.isArray(list) ? list : []);
      } catch {
        if (!ignore) setEvents([]);
      } finally {
        if (!ignore) setEventsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const sortedClubs = useMemo(() => {
    return [...clubs].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  }, [clubs]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }),
    );
  }, [events]);

  useEffect(() => {
    let ignore = false;
    setOverviewLoading(true);
    setOverviewError("");

    const params = new URLSearchParams({ days: String(days) });
    if (clubFilterId) params.set("club_id", clubFilterId);
    if (eventFilterId) params.set("event_id", eventFilterId);

    (async () => {
      try {
        const data = await apiFetch(`/admin/attendance/overview?${params.toString()}`);
        if (!ignore) setOverview(data);
      } catch (e) {
        if (!ignore) {
          setOverview(null);
          setOverviewError(e.message || "Could not load attendance overview.");
        }
      } finally {
        if (!ignore) setOverviewLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [days, clubFilterId, eventFilterId]);

  const daily = overview?.daily && Array.isArray(overview.daily) ? overview.daily : [];

  const viewMode = eventFilterId ? "event_only" : clubFilterId ? "club_only" : "all";

  const eventLegendLabel = eventFilterId
    ? overview?.scope_event_title || sortedEvents.find((ev) => ev.id === eventFilterId)?.title || "Selected event"
    : "Events (all)";

  const clubLegendLabel = clubFilterId
    ? overview?.scope_club_name || sortedClubs.find((c) => c.id === clubFilterId)?.name || "Selected club"
    : "Clubs (all)";

  let description =
    "QR check-ins per day (UTC). Default view compares all event check-ins with all club check-ins.";
  if (viewMode === "event_only") {
    description = `Event-only view: daily check-ins for ${eventLegendLabel}.`;
  } else if (viewMode === "club_only") {
    description = `Club-only view: daily check-ins for ${clubLegendLabel}.`;
  }

  let footnote =
    "Combined view: bars stack event + club totals per day; lines use one scale for both series. Scope one event or one club to see that series alone.";
  if (viewMode === "event_only") {
    footnote = "Only check-ins for the selected event are shown. Clear event scope to compare all events with clubs again.";
  } else if (viewMode === "club_only") {
    footnote = "Only check-ins for the selected club are shown. Clear club scope to bring back events and all clubs.";
  }

  return (
    <div className="flex flex-col gap-[length:var(--space-11)]">
      <Card>
        <CardTitle>Overview</CardTitle>
        <CardDescription>{description}</CardDescription>

        <div className="mt-[length:var(--space-7)] flex flex-wrap items-end gap-[length:var(--space-7)]">
          <div className="min-w-[140px] flex flex-col gap-[length:var(--space-3)]">
            <Label htmlFor="admin-overview-days">Period</Label>
            <Select
              id="admin-overview-days"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-[160px]"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </Select>
          </div>

          <div className="min-w-[200px] flex flex-col gap-[length:var(--space-3)]">
            <Label htmlFor="admin-overview-event">Event scope</Label>
            <Select
              id="admin-overview-event"
              value={eventFilterId}
              onChange={(e) => {
                const v = e.target.value;
                setEventFilterId(v);
                if (v) setClubFilterId("");
              }}
              disabled={eventsLoading}
              className="min-w-[220px] max-w-[min(100%,420px)]"
            >
              <option value="">All events</option>
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[200px] flex flex-col gap-[length:var(--space-3)]">
            <Label htmlFor="admin-overview-club">Club scope</Label>
            <Select
              id="admin-overview-club"
              value={clubFilterId}
              onChange={(e) => {
                const v = e.target.value;
                setClubFilterId(v);
                if (v) setEventFilterId("");
              }}
              disabled={clubsLoading}
              className="min-w-[220px] max-w-[min(100%,420px)]"
            >
              <option value="">All clubs</option>
              {sortedClubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap gap-[length:var(--space-3)]">
            <Button
              type="button"
              variant={chartMode === "lines" ? "default" : "secondary"}
              onClick={() => setChartMode("lines")}
            >
              Line chart
            </Button>
            <Button
              type="button"
              variant={chartMode === "bars" ? "default" : "secondary"}
              onClick={() => setChartMode("bars")}
            >
              Bar chart
            </Button>
          </div>
        </div>

        {overviewError ? (
          <div className="mt-[length:var(--space-7)]">
            <Alert variant="error">{overviewError}</Alert>
          </div>
        ) : null}

        {overviewLoading ? (
          <div className="mt-[length:var(--space-10)]">
            <LoadingState title="Loading attendance" description="Fetching daily check-in totals." />
          </div>
        ) : null}

        {!overviewLoading && overview ? (
          <>
            <div className="mt-[length:var(--space-8)] flex flex-wrap gap-[length:var(--space-10)]">
              {viewMode !== "club_only" ? (
                <div>
                  <p className="m-0 text-[length:var(--font-size-caption)] font-semibold uppercase tracking-[var(--letter-spacing-ui)] text-[var(--color-ink-muted)]">
                    {viewMode === "all" ? "Event check-ins (all events)" : `Event check-ins (${eventLegendLabel})`}
                  </p>
                  <p className="m-0 mt-[length:var(--space-3)] text-[length:var(--font-size-h2)] font-bold tabular-nums text-[var(--color-ink)]">
                    {overview.total_event_check_ins}
                  </p>
                </div>
              ) : null}
              {viewMode !== "event_only" ? (
                <div>
                  <p className="m-0 text-[length:var(--font-size-caption)] font-semibold uppercase tracking-[var(--letter-spacing-ui)] text-[var(--color-ink-muted)]">
                    {viewMode === "all" ? "Club check-ins (all clubs)" : `Club check-ins (${clubLegendLabel})`}
                  </p>
                  <p className="m-0 mt-[length:var(--space-3)] text-[length:var(--font-size-h2)] font-bold tabular-nums text-[var(--color-ink)]">
                    {overview.total_club_check_ins}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-[length:var(--space-8)] overflow-x-auto rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-surface)] p-[length:var(--space-7)]">
              <AttendanceOverviewChart
                daily={daily}
                mode={chartMode}
                viewMode={viewMode}
                eventLegendLabel={eventLegendLabel}
                clubLegendLabel={clubLegendLabel}
              />
            </div>
            <p className="mt-[length:var(--space-5)] m-0 text-[length:var(--font-size-caption)] text-[var(--color-ink-subtle)]">
              {footnote}
            </p>
          </>
        ) : null}
      </Card>
    </div>
  );
}
