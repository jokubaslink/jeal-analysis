import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  emitClubMembershipChanged,
  fetchJoinedClubs,
  subscribeToClubMembershipChanges,
} from "../lib/clubMemberships.js";
import { isEventPast } from "../lib/eventTime.js";
import { Alert, Button, LoadingState } from "../components/ui/index.js";

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
      setMembershipErrorMessage("");
      return undefined;
    }

    let ignore = false;

    const loadMembership = async () => {
      setIsLoadingMembership(true);
      setMembershipErrorMessage("");
      try {
        const list = await fetchJoinedClubs(userId);
        if (!ignore) {
          setIsMember(
            Array.isArray(list) && list.some((c) => String(c.id) === String(clubId))
          );
        }
      } catch (error) {
        if (!ignore) {
          setMembershipErrorMessage(
            error.message || "Could not load your membership status."
          );
        }
      } finally {
        if (!ignore) setIsLoadingMembership(false);
      }
    };

    loadMembership();
    return () => {
      ignore = true;
    };
  }, [clubId, userId]);

  useEffect(() => {
    if (!clubId) return undefined;

    return subscribeToClubMembershipChanges(({ type, clubId: changedClubId }) => {
      if (String(changedClubId) !== String(clubId)) return;
      setIsMember(type === "joined");
      setMembershipErrorMessage("");
    });
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
        emitClubMembershipChanged({ type: "left", clubId });
      } else {
        const joinedClub = await apiFetch(`/clubs/${clubId}/join`, { method: "POST" });
        setIsMember(true);
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
        </div>
        {club.is_active === false && !isMember ? (
          <p style={membershipHint}>Inactive clubs are not open for new members.</p>
        ) : null}
        {membershipErrorMessage ? (
          <Alert variant="error">{membershipErrorMessage}</Alert>
        ) : null}
      </header>

      <section style={panel}>
        <h2 style={sectionTitle}>About</h2>
        <p style={description}>
          {club.description || "No description provided yet."}
        </p>
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
