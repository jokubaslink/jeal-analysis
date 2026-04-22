import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { isEventPast } from "../lib/eventTime.js";
import { Alert, Button, LoadingState } from "../components/ui/index.js";

function formatDate(value) {
  if (!value) return "Date to be announced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date to be announced";
  return parsed.toLocaleString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!eventId) return undefined;
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await apiFetch(`/events/${eventId}`);
        if (!ignore) setEvent(response);
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message || "Could not load event details.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [eventId]);

  if (isLoading) {
    return (
      <div style={page}>
        <LoadingState
          align="center"
          title="Loading event"
          description="Fetching the event details."
        />
      </div>
    );
  }

  if (errorMessage || !event) {
    return (
      <div style={page}>
        <Alert variant="error">{errorMessage || "Event not found."}</Alert>
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" onClick={() => navigate("/events")}>
            Back to events
          </Button>
        </div>
      </div>
    );
  }

  const past = isEventPast(event);

  return (
    <div style={page}>
      <Link to="/events" style={backLink}>
        ← Back to events
      </Link>

      <header style={hero}>
        <div style={topRow}>
          {event.category_name ? (
            <span style={categoryBadge}>{event.category_name}</span>
          ) : null}
          {past ? <span style={pastBadge}>Past</span> : null}
          {event.is_online ? (
            <span style={onlineBadge}>● Online</span>
          ) : null}
        </div>
        <h1 style={title}>{event.title}</h1>

        {event.club_id && event.club_name ? (
          <p style={clubLine}>
            Hosted by{" "}
            <Link to={`/clubs/${event.club_id}`} style={clubLink}>
              {event.club_name}
            </Link>
          </p>
        ) : event.club_name ? (
          <p style={clubLine}>Hosted by {event.club_name}</p>
        ) : null}

        <div style={metaRow}>
          <span style={metaPill}>🗓 {formatDate(event.start_time)}</span>
          {event.end_time ? (
            <span style={metaPill}>⏱ Ends {formatDate(event.end_time)}</span>
          ) : null}
          {event.city ? <span style={metaPill}>📍 {event.city}</span> : null}
          {event.location ? (
            <span style={metaPill}>🏛 {event.location}</span>
          ) : null}
        </div>

        {event.registration_url ? (
          <a
            href={event.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            style={registerButton}
          >
            Register ↗
          </a>
        ) : null}
      </header>

      <section style={panel}>
        <h2 style={sectionTitle}>About this event</h2>
        <p style={description}>
          {event.description || "No description provided yet."}
        </p>
      </section>
    </div>
  );
}

const page = {
  width: "100%",
  maxWidth: "820px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const backLink = {
  display: "inline-flex",
  alignItems: "center",
  color: "#1d4ed8",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "14px",
};

const hero = {
  padding: "clamp(20px, 4vw, 32px)",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(168, 85, 247, 0.10) 100%)",
  border: "1px solid rgba(99, 102, 241, 0.18)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const topRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const categoryBadge = {
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(17, 24, 39, 0.85)",
  color: "white",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const onlineBadge = {
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(16, 185, 129, 0.95)",
  color: "white",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const pastBadge = {
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(107, 114, 128, 0.95)",
  color: "white",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const title = {
  margin: 0,
  fontSize: "clamp(28px, 5vw, 44px)",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  color: "#111827",
};

const clubLine = {
  margin: 0,
  color: "#374151",
  fontSize: "15px",
  fontWeight: 600,
};

const clubLink = {
  color: "#1d4ed8",
  textDecoration: "none",
  fontWeight: 700,
};

const metaRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const metaPill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "white",
  border: "1px solid rgba(17, 24, 39, 0.12)",
  color: "#374151",
  fontSize: "13px",
  fontWeight: 600,
};

const registerButton = {
  alignSelf: "flex-start",
  marginTop: "4px",
  padding: "10px 18px",
  borderRadius: "999px",
  background: "#111827",
  color: "white",
  fontSize: "14px",
  fontWeight: 700,
  textDecoration: "none",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.15)",
};

const panel = {
  padding: "clamp(16px, 3vw, 24px)",
  borderRadius: "20px",
  background: "white",
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const sectionTitle = {
  margin: "0 0 12px 0",
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
};

const description = {
  margin: 0,
  fontSize: "15px",
  lineHeight: 1.6,
  color: "#374151",
  whiteSpace: "pre-wrap",
};
