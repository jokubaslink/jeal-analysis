import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be announced";
  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeRange(start, end) {
  if (!start) return "Time to be announced";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "Time to be announced";

  const startLabel = startDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!end) {
    return startLabel;
  }

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return startLabel;
  }

  const endLabel = endDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startLabel} - ${endLabel}`;
}

function getInitialMonth(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return startOfMonth(new Date());
  }

  const now = Date.now();
  const upcoming = events
    .map((event) => new Date(event.start_time))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() >= now)
    .sort((a, b) => a.getTime() - b.getTime());

  if (upcoming.length > 0) {
    return startOfMonth(upcoming[0]);
  }

  const sorted = events
    .map((event) => new Date(event.start_time))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return sorted.length > 0 ? startOfMonth(sorted[0]) : startOfMonth(new Date());
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RegisteredEventsCalendar({ events }) {
  const [visibleMonth, setVisibleMonth] = useState(() => getInitialMonth(events));
  const [selectedEventId, setSelectedEventId] = useState(null);

  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    events.forEach((event) => {
      const key = toDateKey(event.start_time);
      if (!key) return;
      const existing = grouped.get(key) || [];
      existing.push(event);
      existing.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      grouped.set(key, existing);
    });
    return grouped;
  }, [events]);

  useEffect(() => {
    setVisibleMonth(getInitialMonth(events));
  }, [events]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = startOfMonth(visibleMonth);
    const gridStart = addDays(firstDayOfMonth, -firstDayOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [visibleMonth]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );
  const selectedDateKey = selectedEvent ? toDateKey(selectedEvent.start_time) : null;
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateKey) return [];
    return eventsByDate.get(selectedDateKey) || [];
  }, [eventsByDate, selectedDateKey]);

  useEffect(() => {
    if (events.length === 0) {
      setSelectedEventId(null);
      return;
    }

    if (selectedEventId && events.some((event) => event.id === selectedEventId)) {
      return;
    }

    const monthMatch = events.find((event) => {
      const date = new Date(event.start_time);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === visibleMonth.getFullYear() &&
        date.getMonth() === visibleMonth.getMonth()
      );
    });

    setSelectedEventId((monthMatch || events[0]).id);
  }, [events, selectedEventId, visibleMonth]);

  return (
    <div style={shell}>
      <div style={toolbar}>
        <button
          type="button"
          onClick={() =>
            setVisibleMonth(
              new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
            )
          }
          style={navButton}
          aria-label="Show previous month"
        >
          Previous
        </button>
        <p style={monthLabel}>
          {visibleMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() =>
            setVisibleMonth(
              new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
            )
          }
          style={navButton}
          aria-label="Show next month"
        >
          Next
        </button>
      </div>

      {events.length === 0 ? (
        <p style={emptyMessage}>
          No registered events yet. The calendar is ready for your schedule once you
          mark an event as registered.
        </p>
      ) : null}

      <div style={weekdayRow} aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day} style={weekdayLabel}>
            {day}
          </span>
        ))}
      </div>

      <div style={calendarGrid}>
        {calendarDays.map((day) => {
          const dateKey = toDateKey(day);
          const dayEvents = (dateKey && eventsByDate.get(dateKey)) || [];
          const inMonth = day.getMonth() === visibleMonth.getMonth();
          const isToday = toDateKey(day) === toDateKey(new Date());
          const isSelectedDay = selectedDateKey === dateKey;

          return (
            <div
              key={dateKey || day.toISOString()}
              style={{
                ...dayCell,
                ...(inMonth ? null : outsideMonthDayCell),
                ...(isToday ? todayCell : null),
                ...(isSelectedDay ? selectedDayCell : null),
              }}
            >
              <div style={dayHeader}>
                <span style={dayNumber}>{day.getDate()}</span>
                {dayEvents.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(dayEvents[0].id)}
                    style={daySummaryButton}
                    aria-label={`${day.toLocaleDateString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                  >
                    {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                  </button>
                ) : null}
              </div>
              <div style={eventStack}>
                {dayEvents.slice(0, 3).map((event) => {
                  const isSelected = event.id === selectedEventId;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEventId(event.id)}
                      style={{
                        ...eventPill,
                        ...(isSelected ? selectedEventPill : null),
                      }}
                    >
                      {event.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 ? (
                  <span style={overflowLabel}>+{dayEvents.length - 3} more</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={detailsPanel}>
        {selectedEvent ? (
          <>
            <div style={detailsHeader}>
              <div>
                <p style={detailsEyebrow}>Selected event</p>
                <h3 style={detailsTitle}>{selectedEvent.title}</h3>
              </div>
              <Link to={`/events/${selectedEvent.id}`} style={detailsLink}>
                View details
              </Link>
            </div>
            {selectedDateEvents.length > 1 ? (
              <div style={sameDaySelector}>
                <p style={sameDayLabel}>Events on this day</p>
                <div style={sameDayButtonRow}>
                  {selectedDateEvents.map((event) => {
                    const isActive = event.id === selectedEventId;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEventId(event.id)}
                        style={{
                          ...sameDayButton,
                          ...(isActive ? sameDayButtonActive : null),
                        }}
                      >
                        {event.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <p style={detailsMeta}>{formatDateTime(selectedEvent.start_time)}</p>
            <p style={detailsMeta}>
              {formatTimeRange(selectedEvent.start_time, selectedEvent.end_time)}
            </p>
            {selectedEvent.club_name ? (
              <p style={detailsMeta}>Hosted by {selectedEvent.club_name}</p>
            ) : null}
            {selectedEvent.location || selectedEvent.city ? (
              <p style={detailsMeta}>
                {[selectedEvent.location, selectedEvent.city].filter(Boolean).join(", ")}
              </p>
            ) : null}
            <p style={detailsDescription}>
              {selectedEvent.description || "No description provided yet."}
            </p>
          </>
        ) : (
          <p style={placeholderText}>
            Select an event on the calendar to see its details here.
          </p>
        )}
      </div>
    </div>
  );
}

const shell = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const toolbar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const navButton = {
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "rgba(248, 250, 252, 0.95)",
  color: "#0f172a",
  borderRadius: "999px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const monthLabel = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
};

const emptyMessage = {
  margin: 0,
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.6,
};

const weekdayRow = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: "8px",
};

const weekdayLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  textAlign: "center",
};

const calendarGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: "8px",
};

const dayCell = {
  minHeight: "122px",
  borderRadius: "18px",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: "10px",
  textAlign: "left",
};

const dayHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const outsideMonthDayCell = {
  opacity: 0.45,
};

const todayCell = {
  border: "1px solid rgba(14, 165, 233, 0.5)",
  boxShadow: "0 0 0 1px rgba(14, 165, 233, 0.1)",
};

const selectedDayCell = {
  border: "1px solid rgba(37, 99, 235, 0.45)",
  background: "linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, #ffffff 100%)",
};

const dayNumber = {
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 700,
};

const daySummaryButton = {
  border: "1px solid rgba(14, 165, 233, 0.18)",
  background: "rgba(14, 165, 233, 0.08)",
  color: "#0369a1",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 700,
  cursor: "pointer",
};

const eventStack = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const eventPill = {
  display: "block",
  width: "100%",
  border: "none",
  borderRadius: "12px",
  background: "rgba(14, 165, 233, 0.12)",
  color: "#0f172a",
  padding: "6px 8px",
  fontSize: "11px",
  fontWeight: 600,
  lineHeight: 1.35,
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
  cursor: "pointer",
};

const selectedEventPill = {
  background: "#0f172a",
  color: "#ffffff",
};

const overflowLabel = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: 600,
};

const detailsPanel = {
  borderRadius: "20px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "rgba(248, 250, 252, 0.9)",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const detailsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const detailsEyebrow = {
  margin: "0 0 4px",
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const detailsTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: 800,
};

const detailsLink = {
  color: "#1d4ed8",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "14px",
};

const detailsMeta = {
  margin: 0,
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.5,
};

const sameDaySelector = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const sameDayLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sameDayButtonRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const sameDayButton = {
  border: "1px solid rgba(15, 23, 42, 0.12)",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

const sameDayButtonActive = {
  background: "#0f172a",
  color: "#ffffff",
  border: "1px solid #0f172a",
};

const detailsDescription = {
  margin: 0,
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.6,
};

const placeholderText = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: 1.6,
};
