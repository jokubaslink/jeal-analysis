import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  emitEventRegistrationChanged,
  fetchRegisteredEvents,
  subscribeToEventRegistrationChanges,
} from "../lib/eventRegistrations.js";
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
  const { userId } = useAuth();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(true);
  const [isSavingRegistration, setIsSavingRegistration] = useState(false);
  const [registrationErrorMessage, setRegistrationErrorMessage] = useState("");
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState({ attended: false, checked_in_at: null });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState("");
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");

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

  useEffect(() => {
    if (!userId || !eventId) {
      setIsRegistered(false);
      setIsLoadingRegistration(false);
      setRegistrationErrorMessage("");
      return undefined;
    }

    let ignore = false;

    const loadRegistrationState = async () => {
      setIsLoadingRegistration(true);
      setRegistrationErrorMessage("");
      try {
        const registeredEvents = await fetchRegisteredEvents(userId);
        if (!ignore) {
          setIsRegistered(
            Array.isArray(registeredEvents) &&
              registeredEvents.some((registeredEvent) => registeredEvent.id === eventId)
          );
        }
      } catch (error) {
        if (!ignore) {
          setRegistrationErrorMessage(
            error.message || "Could not load your registration status."
          );
        }
      } finally {
        if (!ignore) setIsLoadingRegistration(false);
      }
    };

    loadRegistrationState();
    return () => {
      ignore = true;
    };
  }, [eventId, userId]);

  useEffect(() => {
    if (!userId || !eventId) {
      setExistingFeedback(null);
      setIsLoadingFeedback(false);
      setFeedbackErrorMessage("");
      setFeedbackSuccessMessage("");
      return undefined;
    }

    let ignore = false;

    const loadFeedback = async () => {
      setIsLoadingFeedback(true);
      setFeedbackErrorMessage("");
      try {
        const response = await apiFetch(`/events/${eventId}/feedback`);
        if (!ignore) {
          setExistingFeedback(response || null);
        }
      } catch (error) {
        if (!ignore) {
          setFeedbackErrorMessage(error.message || "Could not load your feedback.");
        }
      } finally {
        if (!ignore) setIsLoadingFeedback(false);
      }
    };

    loadFeedback();
    return () => {
      ignore = true;
    };
  }, [eventId, userId]);

  useEffect(() => {
    if (!userId || !eventId) {
      setAttendanceStatus({ attended: false, checked_in_at: null });
      setIsLoadingAttendance(false);
      return undefined;
    }

    let ignore = false;

    const loadAttendance = async () => {
      setIsLoadingAttendance(true);
      try {
        const response = await apiFetch(`/events/${eventId}/attendance`);
        if (!ignore) {
          setAttendanceStatus({
            attended: !!response?.attended,
            checked_in_at: response?.checked_in_at || null,
          });
        }
      } catch {
        if (!ignore) {
          setAttendanceStatus({ attended: false, checked_in_at: null });
        }
      } finally {
        if (!ignore) setIsLoadingAttendance(false);
      }
    };

    loadAttendance();
    return () => {
      ignore = true;
    };
  }, [eventId, userId]);

  useEffect(() => {
    if (!eventId) return undefined;

    return subscribeToEventRegistrationChanges(
      ({ type, eventId: changedEventId, event: changedEvent }) => {
        if (String(changedEventId) !== String(eventId)) return;
        setIsRegistered(type === "registered");
        setEvent((prev) => {
          if (!prev) return prev;
          if (changedEvent?.id) {
            return { ...prev, ...changedEvent };
          }
          if (type === "unregistered") {
            return {
              ...prev,
              attendee_count: Math.max(0, (prev.attendee_count || 0) - 1),
            };
          }
          return prev;
        });
        setRegistrationErrorMessage("");
      }
    );
  }, [eventId]);

  const handleToggleRegistration = async () => {
    if (!eventId) return;
    if (!userId) {
      navigate("/login");
      return;
    }

    setIsSavingRegistration(true);
    setRegistrationErrorMessage("");

    try {
      if (isRegistered) {
        await apiFetch(`/events/${eventId}/register`, { method: "DELETE" });
        setIsRegistered(false);
        setEvent((prev) =>
          prev
            ? { ...prev, attendee_count: Math.max(0, (prev.attendee_count || 0) - 1) }
            : prev
        );
        emitEventRegistrationChanged({
          type: "unregistered",
          eventId,
          event: {
            ...event,
            attendee_count: Math.max(0, (event?.attendee_count || 0) - 1),
          },
        });
      } else {
        const registeredEvent = await apiFetch(`/events/${eventId}/register`, { method: "POST" });
        setIsRegistered(true);
        setEvent((prev) => (prev ? { ...prev, ...registeredEvent } : prev));
        emitEventRegistrationChanged({
          type: "registered",
          eventId,
          event: registeredEvent,
        });
      }
    } catch (error) {
      setRegistrationErrorMessage(
        error.message || "Could not update your registered events."
      );
    } finally {
      setIsSavingRegistration(false);
    }
  };

  const handleSubmitFeedback = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!eventId) return;

    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackErrorMessage("Choose a rating before submitting feedback.");
      setFeedbackSuccessMessage("");
      return;
    }

    setIsSavingFeedback(true);
    setFeedbackErrorMessage("");
    setFeedbackSuccessMessage("");

    try {
      const response = await apiFetch(`/events/${eventId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment || null,
        }),
      });
      setExistingFeedback(response);
      setFeedbackComment("");
      setFeedbackRating(0);
      setFeedbackSuccessMessage("Thanks for sharing your experience.");
    } catch (error) {
      setFeedbackErrorMessage(error.message || "Could not submit your feedback.");
    } finally {
      setIsSavingFeedback(false);
    }
  };

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
  const canLeaveFeedback = past && attendanceStatus.attended;

  return (
    <div style={page}>
      <Link to="/events" style={backLink}>
        Back to events
      </Link>

      {event.image_url ? (
        <div style={imageWrap}>
          <img
            src={event.image_url}
            alt={event.title}
            style={imageStyle}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : null}

      <header style={hero}>
        <div style={topRow}>
          {event.category_name ? (
            <span style={categoryBadge}>{event.category_name}</span>
          ) : null}
          {past ? <span style={pastBadge}>Past</span> : null}
          {event.is_online ? <span style={onlineBadge}>Online</span> : null}
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
          <span style={metaPill}>{formatDate(event.start_time)}</span>
          {event.end_time ? (
            <span style={metaPill}>Ends {formatDate(event.end_time)}</span>
          ) : null}
          {event.city ? <span style={metaPill}>{event.city}</span> : null}
          {event.location ? <span style={metaPill}>{event.location}</span> : null}
          <span style={metaPill}>
            {event.attendee_count === 1
              ? "1 attendee"
              : `${event.attendee_count || 0} attendees`}
          </span>
        </div>

        <div style={actionRow}>
          {event.registration_url ? (
            <a
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              style={registerButton}
            >
              Register
            </a>
          ) : null}
          <Button
            variant={isRegistered ? "secondary" : "primary"}
            onClick={handleToggleRegistration}
            disabled={isSavingRegistration || isLoadingRegistration || (past && !isRegistered)}
          >
            {isLoadingRegistration
              ? "Checking status..."
              : isSavingRegistration
                ? "Saving..."
                : isRegistered
                  ? "Leave event"
                  : "Attend event"}
          </Button>
        </div>
        {past && !isRegistered ? (
          <p style={helperText}>Past events cannot be added to your dashboard calendar.</p>
        ) : null}
        {registrationErrorMessage ? (
          <Alert variant="error">{registrationErrorMessage}</Alert>
        ) : null}
      </header>

      <section style={panel}>
        <h2 style={sectionTitle}>About this event</h2>
        <p style={description}>
          {event.description || "No description provided yet."}
        </p>
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}>Your feedback</h2>
        {feedbackErrorMessage ? <Alert variant="error">{feedbackErrorMessage}</Alert> : null}
        {feedbackSuccessMessage ? <Alert variant="success">{feedbackSuccessMessage}</Alert> : null}
        {isLoadingAttendance ? (
          <p style={helperText}>Checking your attendance…</p>
        ) : !canLeaveFeedback ? (
          <p style={description}>
            Feedback becomes available after the event ends and after you check in with the event QR code.
          </p>
        ) : isLoadingFeedback ? (
          <p style={helperText}>Loading your feedback status…</p>
        ) : existingFeedback ? (
          <div style={feedbackSummary}>
            <p style={feedbackRatingLine}>
              {"★".repeat(existingFeedback.rating)}
              {"☆".repeat(Math.max(0, 5 - existingFeedback.rating))}
            </p>
            <p style={feedbackMeta}>
              Submitted {formatDate(existingFeedback.submitted_at)}
            </p>
            <p style={description}>
              {existingFeedback.comment ||
                "You submitted a rating without an additional comment."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} style={feedbackForm}>
            <div style={feedbackField}>
              <span style={feedbackLabel}>Rating</span>
              <div style={ratingRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFeedbackRating(value)}
                    style={{
                      ...ratingButton,
                      ...(feedbackRating === value ? ratingButtonActive : null),
                    }}
                  >
                    {value}★
                  </button>
                ))}
              </div>
            </div>

            <label style={feedbackField}>
              <span style={feedbackLabel}>Comment</span>
              <textarea
                value={feedbackComment}
                onChange={(changeEvent) => setFeedbackComment(changeEvent.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Optional: what went well, or what could be improved?"
                style={feedbackTextarea}
              />
            </label>

            <Button type="submit" disabled={isSavingFeedback}>
              {isSavingFeedback ? "Submitting..." : "Submit feedback"}
            </Button>
          </form>
        )}
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

const imageWrap = {
  width: "100%",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(99, 102, 241, 0.18)",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.12)",
  background: "#f3f4f6",
};

const imageStyle = {
  width: "100%",
  height: "auto",
  maxHeight: "520px",
  objectFit: "cover",
  display: "block",
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

const actionRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  alignItems: "center",
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

const helperText = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: 1.5,
};

const feedbackForm = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const feedbackField = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const feedbackLabel = {
  margin: 0,
  color: "#111827",
  fontSize: "13px",
  fontWeight: 700,
};

const ratingRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const ratingButton = {
  padding: "10px 14px",
  borderRadius: "999px",
  border: "1px solid rgba(99, 102, 241, 0.18)",
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "13px",
};

const ratingButtonActive = {
  background: "#111827",
  color: "#ffffff",
  borderColor: "#111827",
};

const feedbackTextarea = {
  width: "100%",
  borderRadius: "16px",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  padding: "12px 14px",
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#111827",
  resize: "vertical",
  boxSizing: "border-box",
  background: "#ffffff",
};

const feedbackSummary = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const feedbackRatingLine = {
  margin: 0,
  color: "#f59e0b",
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const feedbackMeta = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
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
