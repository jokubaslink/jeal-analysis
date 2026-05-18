import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  emitClubMembershipChanged,
  fetchJoinedClubs,
  subscribeToClubMembershipChanges,
} from "../lib/clubMemberships.js";
import {
  createSavedClubIdSet,
  emitSavedItemChanged,
  fetchSavedClubs,
} from "../lib/savedItems.js";
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

export default function ClubDetail() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);
  const [isSavingMembership, setIsSavingMembership] = useState(false);
  const [membershipErrorMessage, setMembershipErrorMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingSavedState, setIsLoadingSavedState] = useState(true);
  const [isSavingSavedState, setIsSavingSavedState] = useState(false);
  const [savedErrorMessage, setSavedErrorMessage] = useState("");
  const [feedbackContext, setFeedbackContext] = useState({
    opportunities: [],
    submitted_feedback: [],
  });
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState("");
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState("");
  const [selectedOccurrence, setSelectedOccurrence] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    if (!clubId) return undefined;
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const clubResponse = await apiFetch(`/clubs/${clubId}`);
        if (ignore) return;
        setClub(clubResponse);

        try {
          const eventsResponse = await apiFetch(`/events?club_id=${clubId}`);
          if (!ignore) {
            setEvents(Array.isArray(eventsResponse) ? eventsResponse : []);
          }
        } catch {
          if (!ignore) setEvents([]);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message || "Could not load club details.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [clubId]);

  useEffect(() => {
    if (!userId || !clubId) {
      setIsMember(false);
      setIsLoadingMembership(false);
      setIsSaved(false);
      setIsLoadingSavedState(false);
      setMembershipErrorMessage("");
      setSavedErrorMessage("");
      return undefined;
    }

    let ignore = false;

    const loadMembership = async () => {
      setIsLoadingMembership(true);
      setIsLoadingSavedState(true);
      setMembershipErrorMessage("");
      setSavedErrorMessage("");
      try {
        const [list, savedList] = await Promise.all([
          fetchJoinedClubs(userId),
          fetchSavedClubs(userId),
        ]);
        if (!ignore) {
          setIsMember(
            Array.isArray(list) && list.some((c) => String(c.id) === String(clubId))
          );
          setIsSaved(createSavedClubIdSet(savedList).has(String(clubId)));
        }
      } catch (error) {
        if (!ignore) {
          setMembershipErrorMessage(
            error.message || "Could not load your club status."
          );
        }
      } finally {
        if (!ignore) {
          setIsLoadingMembership(false);
          setIsLoadingSavedState(false);
        }
      }
    };

    loadMembership();
    return () => {
      ignore = true;
    };
  }, [clubId, userId]);

  useEffect(() => {
    if (!clubId || !isMember) {
      setFeedbackContext({ opportunities: [], submitted_feedback: [] });
      setSelectedOccurrence("");
      setFeedbackErrorMessage("");
      setFeedbackSuccessMessage("");
      setIsLoadingFeedback(false);
      return undefined;
    }

    let ignore = false;

    const loadFeedbackContext = async () => {
      setIsLoadingFeedback(true);
      setFeedbackErrorMessage("");
      try {
        const response = await apiFetch(`/clubs/${clubId}/feedback-context`);
        if (ignore) return;

        const nextContext = {
          opportunities: Array.isArray(response?.opportunities) ? response.opportunities : [],
          submitted_feedback: Array.isArray(response?.submitted_feedback)
            ? response.submitted_feedback
            : [],
        };
        setFeedbackContext(nextContext);
        const firstAvailable = nextContext.opportunities.find(
          (item) => !item.already_submitted
        );
        setSelectedOccurrence(firstAvailable?.activity_start_time || "");
      } catch (error) {
        if (!ignore) {
          setFeedbackErrorMessage(error.message || "Could not load club feedback.");
        }
      } finally {
        if (!ignore) setIsLoadingFeedback(false);
      }
    };

    loadFeedbackContext();
    return () => {
      ignore = true;
    };
  }, [clubId, isMember]);

  useEffect(() => {
    if (!clubId) return undefined;

    return subscribeToClubMembershipChanges(
      ({ type, clubId: changedClubId, club: changedClub }) => {
        if (String(changedClubId) !== String(clubId)) return;
        setIsMember(type === "joined");
        setClub((prev) => {
          if (!prev) return prev;
          if (changedClub?.id) {
            return { ...prev, ...changedClub };
          }
          if (type === "left") {
            return {
              ...prev,
              member_count: Math.max(0, (prev.member_count || 0) - 1),
            };
          }
          return prev;
        });
        setMembershipErrorMessage("");
      }
    );
  }, [clubId]);

  const handleToggleMembership = async () => {
    if (!clubId) return;
    if (!userId) {
      navigate("/login");
      return;
    }

    setIsSavingMembership(true);
    setMembershipErrorMessage("");

    try {
      if (isMember) {
        await apiFetch(`/clubs/${clubId}/join`, { method: "DELETE" });
        setIsMember(false);
        setClub((prev) =>
          prev
            ? { ...prev, member_count: Math.max(0, (prev.member_count || 0) - 1) }
            : prev
        );
        emitClubMembershipChanged({
          type: "left",
          clubId,
          club: {
            ...club,
            member_count: Math.max(0, (club?.member_count || 0) - 1),
          },
        });
      } else {
        const joinedClub = await apiFetch(`/clubs/${clubId}/join`, { method: "POST" });
        setIsMember(true);
        setClub((prev) => (prev ? { ...prev, ...joinedClub } : prev));
        emitClubMembershipChanged({ type: "joined", clubId, club: joinedClub });
      }
    } catch (error) {
      setMembershipErrorMessage(
        error.message || "Could not update your club membership."
      );
    } finally {
      setIsSavingMembership(false);
    }
  };

  const handleToggleSavedClub = async () => {
    if (!clubId) return;
    if (!userId) {
      navigate("/login");
      return;
    }

    setIsSavingSavedState(true);
    setSavedErrorMessage("");

    try {
      if (isSaved) {
        await apiFetch(`/clubs/${clubId}/save`, { method: "DELETE" });
        setIsSaved(false);
        emitSavedItemChanged({ itemType: "club", type: "removed", itemId: clubId });
        return;
      }

      const savedClub = await apiFetch(`/clubs/${clubId}/save`, { method: "POST" });
      setIsSaved(true);
      emitSavedItemChanged({
        itemType: "club",
        type: "saved",
        itemId: clubId,
        item: savedClub,
      });
    } catch (error) {
      setSavedErrorMessage(error.message || "Could not update saved clubs.");
    } finally {
      setIsSavingSavedState(false);
    }
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming = [];
    const past = [];
    events.forEach((event) => {
      (isEventPast(event) ? past : upcoming).push(event);
    });
    const byStart = (a, b) => {
      const at = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bt = b.start_time ? new Date(b.start_time).getTime() : 0;
      return at - bt;
    };
    upcoming.sort(byStart);
    past.sort((a, b) => byStart(b, a));
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  const handleSubmitFeedback = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!clubId) return;

    if (!selectedOccurrence) {
      setFeedbackErrorMessage("Choose a club activity before submitting feedback.");
      setFeedbackSuccessMessage("");
      return;
    }
    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackErrorMessage("Choose a rating before submitting feedback.");
      setFeedbackSuccessMessage("");
      return;
    }

    setIsSavingFeedback(true);
    setFeedbackErrorMessage("");
    setFeedbackSuccessMessage("");

    try {
      const created = await apiFetch(`/clubs/${clubId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          activity_start_time: selectedOccurrence,
          rating: feedbackRating,
          comment: feedbackComment || null,
        }),
      });

      const nextOpportunities = feedbackContext.opportunities.map((item) =>
        item.activity_start_time === selectedOccurrence
          ? { ...item, already_submitted: true }
          : item
      );
      const nextOpportunity = nextOpportunities.find((item) => !item.already_submitted);

      setFeedbackContext((prev) => ({
        opportunities: nextOpportunities,
        submitted_feedback: [created, ...prev.submitted_feedback],
      }));
      setSelectedOccurrence(nextOpportunity?.activity_start_time || "");
      setFeedbackRating(0);
      setFeedbackComment("");
      setFeedbackSuccessMessage("Thanks for sharing your club experience.");
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
          title="Loading club"
          description="Fetching the club details."
        />
      </div>
    );
  }

  if (errorMessage || !club) {
    return (
      <div style={page}>
        <Alert variant="error">{errorMessage || "Club not found."}</Alert>
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" onClick={() => navigate("/clubs")}>
            Back to clubs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <Link to="/clubs" style={backLink}>
        ← Back to clubs
      </Link>

      <header style={hero}>
        {club.category_name ? (
          <span style={categoryBadge}>{club.category_name}</span>
        ) : null}
        <h1 style={title}>{club.name}</h1>
        <div style={metaRow}>
          {club.city ? <span style={metaPill}>📍 {club.city}</span> : null}
          {club.location ? <span style={metaPill}>🏛 {club.location}</span> : null}
          <span style={metaPill}>
            {club.member_count === 1 ? "1 member" : `${club.member_count || 0} members`}
          </span>
          {club.is_active === false ? (
            <span style={inactivePill}>Inactive</span>
          ) : null}
        </div>
        <div style={heroActions}>
          {club.website_url ? (
            <a
              href={club.website_url}
              target="_blank"
              rel="noopener noreferrer"
              style={websiteButton}
            >
              Visit website ↗
            </a>
          ) : null}
          <Button
            variant={isMember ? "secondary" : "primary"}
            onClick={handleToggleMembership}
            disabled={
              isSavingMembership ||
              isLoadingMembership ||
              (club.is_active === false && !isMember)
            }
          >
            {isLoadingMembership
              ? "Checking membership..."
              : isSavingMembership
                ? "Saving..."
                : !userId
                  ? "Log in to join"
                  : isMember
                    ? "Leave club"
                    : "Join club"}
          </Button>
          <Button
            variant={isSaved ? "secondary" : "primary"}
            onClick={handleToggleSavedClub}
            disabled={isSavingSavedState || isLoadingSavedState}
          >
            {isLoadingSavedState
              ? "Checking saved..."
              : isSavingSavedState
                ? "Saving..."
                : !userId
                  ? "Log in to save"
                  : isSaved
                    ? "Saved"
                    : "Save for later"}
          </Button>
        </div>
        {club.is_active === false && !isMember ? (
          <p style={membershipHint}>Inactive clubs are not open for new members.</p>
        ) : null}
        {membershipErrorMessage ? (
          <Alert variant="error">{membershipErrorMessage}</Alert>
        ) : null}
        {savedErrorMessage ? (
          <Alert variant="error">{savedErrorMessage}</Alert>
        ) : null}
      </header>

      <section style={panel}>
        <h2 style={sectionTitle}>About</h2>
        <p style={description}>
          {club.description || "No description provided yet."}
        </p>
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}>Club activity feedback</h2>
        {feedbackErrorMessage ? <Alert variant="error">{feedbackErrorMessage}</Alert> : null}
        {feedbackSuccessMessage ? <Alert variant="success">{feedbackSuccessMessage}</Alert> : null}
        {!isMember ? (
          <p style={description}>
            Join the club first, then check in with the activity QR code before leaving feedback.
          </p>
        ) : isLoadingFeedback ? (
          <p style={membershipHint}>Loading recent club activities…</p>
        ) : (
          <div style={feedbackBlock}>
            {feedbackContext.opportunities.some((item) => !item.already_submitted) ? (
              <form onSubmit={handleSubmitFeedback} style={feedbackForm}>
                <label style={feedbackField}>
                  <span style={feedbackLabel}>Club activity</span>
                  <select
                    value={selectedOccurrence}
                    onChange={(changeEvent) => setSelectedOccurrence(changeEvent.target.value)}
                    style={feedbackSelect}
                  >
                    <option value="">Choose an activity</option>
                    {feedbackContext.opportunities
                      .filter((item) => !item.already_submitted)
                      .map((item) => (
                        <option
                          key={item.activity_start_time}
                          value={item.activity_start_time}
                        >
                          {formatDate(item.activity_start_time)}
                        </option>
                      ))}
                  </select>
                </label>

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
                    placeholder="Optional: tell the club what worked well or what to improve."
                    style={feedbackTextarea}
                  />
                </label>

                <Button type="submit" disabled={isSavingFeedback}>
                  {isSavingFeedback ? "Submitting..." : "Submit feedback"}
                </Button>
              </form>
            ) : (
              <p style={description}>
                {feedbackContext.submitted_feedback.length > 0
                  ? "You have already submitted feedback for the club activities you checked into."
                  : "No checked-in club activities are eligible for feedback yet."}
              </p>
            )}

            {feedbackContext.submitted_feedback.length > 0 ? (
              <div style={feedbackHistory}>
                <h3 style={feedbackHistoryTitle}>Submitted feedback</h3>
                <div style={feedbackHistoryList}>
                  {feedbackContext.submitted_feedback.map((entry) => (
                    <article
                      key={`${entry.club_id}-${entry.activity_start_time}`}
                      style={feedbackHistoryCard}
                    >
                      <p style={feedbackHistoryDate}>
                        {formatDate(entry.activity_start_time)}
                      </p>
                      <p style={feedbackHistoryRating}>
                        {"★".repeat(entry.rating)}
                        {"☆".repeat(Math.max(0, 5 - entry.rating))}
                      </p>
                      <p style={feedbackHistoryComment}>
                        {entry.comment || "No comment left."}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section style={panel}>
        <h2 style={sectionTitle}>Upcoming events</h2>
        {upcomingEvents.length === 0 ? (
          <p style={emptyText}>No upcoming events for this club yet.</p>
        ) : (
          <ul style={eventList}>
            {upcomingEvents.map((event) => (
              <li key={event.id} style={eventItem}>
                <Link to={`/events/${event.id}`} style={eventLink}>
                  <span style={eventTitle}>{event.title}</span>
                  {event.start_time ? (
                    <span style={eventDate}>
                      {new Date(event.start_time).toLocaleString()}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pastEvents.length > 0 ? (
        <section style={panel}>
          <h2 style={sectionTitle}>Past events</h2>
          <p style={pastHint}>Ended activities — open a row for full details.</p>
          <ul style={eventList}>
            {pastEvents.map((event) => (
              <li key={event.id} style={{ ...eventItem, opacity: 0.92 }}>
                <Link to={`/events/${event.id}`} style={eventLink}>
                  <span style={eventTitleRow}>
                    <span style={pastTag}>Past</span>
                    <span style={eventTitle}>{event.title}</span>
                  </span>
                  {event.start_time ? (
                    <span style={eventDate}>
                      {new Date(event.start_time).toLocaleString()}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
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
    "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(236, 72, 153, 0.10) 100%)",
  border: "1px solid rgba(99, 102, 241, 0.18)",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const categoryBadge = {
  alignSelf: "flex-start",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(17, 24, 39, 0.85)",
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

const inactivePill = {
  ...metaPill,
  background: "#fef2f2",
  borderColor: "#fecaca",
  color: "#b91c1c",
};

const heroActions = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "10px",
  alignSelf: "flex-start",
  marginTop: "4px",
};

const membershipHint = {
  margin: 0,
  fontSize: "13px",
  color: "#b45309",
  fontWeight: 600,
};

const websiteButton = {
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

const feedbackBlock = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
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

const feedbackSelect = {
  width: "100%",
  borderRadius: "14px",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#111827",
  background: "#ffffff",
  boxSizing: "border-box",
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

const feedbackHistory = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const feedbackHistoryTitle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 700,
  color: "#111827",
};

const feedbackHistoryList = {
  display: "grid",
  gap: "10px",
};

const feedbackHistoryCard = {
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};

const feedbackHistoryDate = {
  margin: 0,
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const feedbackHistoryRating = {
  margin: "8px 0 0 0",
  color: "#f59e0b",
  fontSize: "16px",
  fontWeight: 800,
};

const feedbackHistoryComment = {
  margin: "8px 0 0 0",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.5,
};

const emptyText = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const eventList = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const eventItem = {
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  background: "#fafafa",
};

const eventLink = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px 14px",
  textDecoration: "none",
  color: "#111827",
};

const eventTitle = {
  fontWeight: 700,
  fontSize: "14px",
};

const eventDate = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: 600,
};

const pastHint = {
  margin: "0 0 12px 0",
  fontSize: "13px",
  color: "#6b7280",
};

const eventTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const pastTag = {
  flexShrink: 0,
  padding: "2px 8px",
  borderRadius: "999px",
  background: "#e5e7eb",
  color: "#374151",
  fontSize: "10px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
