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

function parseTimeParts(value) {
  if (!value || typeof value !== "string") return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
}

function clubWeekdayToJsDay(weekday) {
  if (typeof weekday !== "number") return null;
  return (weekday + 1) % 7;
}

function meetingWeekdayLabel(weekday) {
  return WEEKDAY_NAMES[weekday] || "Club activity";
}

function buildClubOccurrence(club, day) {
  const jsDay = clubWeekdayToJsDay(club.meeting_weekday);
  const startParts = parseTimeParts(club.meeting_start_time);
  if (jsDay === null || !startParts || day.getDay() !== jsDay) {
    return null;
  }

  const start = new Date(day);
  start.setHours(startParts.hours, startParts.minutes, 0, 0);

  let end = null;
  const endParts = parseTimeParts(club.meeting_end_time);
  if (endParts) {
    end = new Date(day);
    end.setHours(endParts.hours, endParts.minutes, 0, 0);
  }

  const dateKey = toDateKey(start);
  return {
    id: `club-${club.id}-${dateKey}`,
    type: "club",
    source_id: club.id,
    title: club.name,
    start_time: start.toISOString(),
    end_time: end ? end.toISOString() : null,
    club_id: club.id,
    club_name: club.name,
    location: club.location,
    city: club.city,
    description:
      club.description || "Recurring club activity shown from your joined club schedule.",
    meeting_weekday: club.meeting_weekday,
  };
}

function getInitialMonth(events, clubAttendances) {
  if (Array.isArray(events) && events.length > 0) {
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

    if (sorted.length > 0) {
      return startOfMonth(sorted[0]);
    }
  }

  const hasRecurringClubs = (clubAttendances || []).some(
    (club) =>
      typeof club.meeting_weekday === "number" &&
      typeof club.meeting_start_time === "string"
  );
  if (hasRecurringClubs) {
    return startOfMonth(new Date());
  }

  return startOfMonth(new Date());
}

function entryTypeLabel(entry) {
  return entry.type === "club" ? "Club activity" : "Registered event";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function RegisteredEventsCalendar({
  events,
  clubAttendances = [],
}) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getInitialMonth(events, clubAttendances)
  );
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  useEffect(() => {
    setVisibleMonth(getInitialMonth(events, clubAttendances));
  }, [events, clubAttendances]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = startOfMonth(visibleMonth);
    const gridStart = addDays(firstDayOfMonth, -firstDayOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [visibleMonth]);

  const clubEntries = useMemo(() => {
    const occurrences = [];
    const seen = new Set();
    calendarDays.forEach((day) => {
      clubAttendances.forEach((club) => {
        const occurrence = buildClubOccurrence(club, day);
        if (!occurrence || seen.has(occurrence.id)) return;
        seen.add(occurrence.id);
        occurrences.push(occurrence);
      });
    });
    return occurrences;
  }, [calendarDays, clubAttendances]);

  const allEntries = useMemo(() => {
    const combined = [
      ...(Array.isArray(events)
        ? events.map((event) => ({
            ...event,
            type: "event",
            source_id: event.id,
          }))
        : []),
      ...clubEntries,
    ];

    combined.sort((a, b) => {
      const aTime = new Date(a.start_time).getTime();
      const bTime = new Date(b.start_time).getTime();
      return aTime - bTime;
    });
    return combined;
  }, [events, clubEntries]);

  const entriesByDate = useMemo(() => {
    const grouped = new Map();
    allEntries.forEach((entry) => {
      const key = toDateKey(entry.start_time);
      if (!key) return;
      const existing = grouped.get(key) || [];
      existing.push(entry);
      existing.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      grouped.set(key, existing);
    });
    return grouped;
  }, [allEntries]);

  const selectedEntry = useMemo(
    () => allEntries.find((entry) => entry.id === selectedEntryId) || null,
    [allEntries, selectedEntryId]
  );
  const selectedDateKey = selectedEntry ? toDateKey(selectedEntry.start_time) : null;
  const selectedDateEntries = useMemo(() => {
    if (!selectedDateKey) return [];
    return entriesByDate.get(selectedDateKey) || [];
  }, [entriesByDate, selectedDateKey]);

  useEffect(() => {
    if (allEntries.length === 0) {
      setSelectedEntryId(null);
      return;
    }

    if (selectedEntryId && allEntries.some((entry) => entry.id === selectedEntryId)) {
      return;
    }

    const monthMatch = allEntries.find((entry) => {
      const date = new Date(entry.start_time);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === visibleMonth.getFullYear() &&
        date.getMonth() === visibleMonth.getMonth()
      );
    });

    setSelectedEntryId((monthMatch || allEntries[0]).id);
  }, [allEntries, selectedEntryId, visibleMonth]);

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

      {allEntries.length === 0 ? (
        <p style={emptyMessage}>
          No registered events or club attendance times yet. The calendar is ready
          once you register for events or join clubs with recurring activities.
        </p>
      ) : null}

      <div style={legendRow}>
        <span style={legendItem}>
          <span style={{ ...legendSwatch, ...eventLegendSwatch }} />
          Registered events
        </span>
        <span style={legendItem}>
          <span style={{ ...legendSwatch, ...clubLegendSwatch }} />
          Club activities
        </span>
      </div>

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
          const dayEntries = (dateKey && entriesByDate.get(dateKey)) || [];
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
                {dayEntries.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedEntryId(dayEntries[0].id)}
                    style={daySummaryButton}
                    aria-label={`${day.toLocaleDateString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}, ${dayEntries.length} item${dayEntries.length === 1 ? "" : "s"}`}
                  >
                    {dayEntries.length} item{dayEntries.length === 1 ? "" : "s"}
                  </button>
                ) : null}
              </div>
              <div style={eventStack}>
                {dayEntries.slice(0, 3).map((entry) => {
                  const isSelected = entry.id === selectedEntryId;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedEntryId(entry.id)}
                      style={{
                        ...eventPill,
                        ...(entry.type === "club" ? clubEventPill : null),
                        ...(isSelected ? selectedEventPill : null),
                      }}
                    >
                      {entry.title}
                    </button>
                  );
                })}
                {dayEntries.length > 3 ? (
                  <span style={overflowLabel}>+{dayEntries.length - 3} more</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={detailsPanel}>
        {selectedEntry ? (
          <>
            <div style={detailsHeader}>
              <div>
                <p style={detailsEyebrow}>{entryTypeLabel(selectedEntry)}</p>
                <h3 style={detailsTitle}>{selectedEntry.title}</h3>
              </div>
              <Link
                to={
                  selectedEntry.type === "club"
                    ? `/clubs/${selectedEntry.club_id}`
                    : `/events/${selectedEntry.id}`
                }
                style={detailsLink}
              >
                View details
              </Link>
            </div>
            {selectedDateEntries.length > 1 ? (
              <div style={sameDaySelector}>
                <p style={sameDayLabel}>Items on this day</p>
                <div style={sameDayButtonRow}>
                  {selectedDateEntries.map((entry) => {
                    const isActive = entry.id === selectedEntryId;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedEntryId(entry.id)}
                        style={{
                          ...sameDayButton,
                          ...(entry.type === "club" ? clubSameDayButton : null),
                          ...(isActive ? sameDayButtonActive : null),
                        }}
                      >
                        {entry.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <p style={detailsMeta}>{formatDateTime(selectedEntry.start_time)}</p>
            <p style={detailsMeta}>
              {formatTimeRange(selectedEntry.start_time, selectedEntry.end_time)}
            </p>
            {selectedEntry.type === "club" && selectedEntry.meeting_weekday !== undefined ? (
              <p style={detailsMeta}>
                Recurs every {meetingWeekdayLabel(selectedEntry.meeting_weekday)}
              </p>
            ) : null}
            {selectedEntry.club_name && selectedEntry.type !== "club" ? (
              <p style={detailsMeta}>Hosted by {selectedEntry.club_name}</p>
            ) : null}
            {selectedEntry.location || selectedEntry.city ? (
              <p style={detailsMeta}>
                {[selectedEntry.location, selectedEntry.city].filter(Boolean).join(", ")}
              </p>
            ) : null}
            <p style={detailsDescription}>
              {selectedEntry.description ||
                (selectedEntry.type === "club"
                  ? "Recurring club activity shown from your joined club schedule."
                  : "No description provided yet.")}
            </p>
          </>
        ) : (
          <p style={placeholderText}>
            Select an event or club activity on the calendar to see its details here.
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

const legendRow = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  alignItems: "center",
};

const legendItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  color: "#4b5563",
  fontSize: "12px",
  fontWeight: 700,
};

const legendSwatch = {
  width: "12px",
  height: "12px",
  borderRadius: "999px",
  display: "inline-block",
};

const eventLegendSwatch = {
  background: "rgba(14, 165, 233, 0.5)",
};

const clubLegendSwatch = {
  background: "rgba(16, 185, 129, 0.55)",
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

const clubEventPill = {
  background: "rgba(16, 185, 129, 0.14)",
  color: "#065f46",
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

const clubSameDayButton = {
  border: "1px solid rgba(16, 185, 129, 0.18)",
  background: "rgba(16, 185, 129, 0.08)",
  color: "#065f46",
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
