import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { syncPendingOnboardingToUser } from "../onboarding/syncOnboardingToUser.js";
import { Alert, Button, EmptyState, LoadingState } from "../components/ui/index.js";

export default function Results() {
  const navigate = useNavigate();
  const { userId, logout } = useAuth();
  const [interests, setInterests] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let ignore = false;

    const loadResults = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        await syncPendingOnboardingToUser(userId, apiFetch);

        const [savedInterestsResult, recommendedClubsResult, recommendedEventsResult] =
          await Promise.allSettled([
          apiFetch(`/users/${userId}/interests`),
          apiFetch("/clubs/recommended"),
          apiFetch("/events/recommended"),
          ]);

        if (ignore) {
          return;
        }

        if (savedInterestsResult.status === "fulfilled") {
          setInterests(Array.isArray(savedInterestsResult.value) ? savedInterestsResult.value : []);
        } else {
          throw savedInterestsResult.reason;
        }

        if (recommendedClubsResult.status === "fulfilled") {
          setClubs(Array.isArray(recommendedClubsResult.value) ? recommendedClubsResult.value : []);
        } else {
          setClubs([]);
        }

        if (recommendedEventsResult.status === "fulfilled") {
          setEvents(Array.isArray(recommendedEventsResult.value) ? recommendedEventsResult.value : []);
        } else {
          setEvents([]);
        }

        const recommendationErrors = [
          recommendedClubsResult,
          recommendedEventsResult,
        ].filter((result) => result.status === "rejected");

        if (recommendationErrors.length > 0) {
          setErrorMessage(
            "We could not load all of your recommendations right now. Please try again."
          );
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error.status === 401 || error.status === 403) {
          logout();
          navigate("/login", { replace: true, state: { from: "/results" } });
          return;
        }

        setErrorMessage("We could not load your recommendations right now. Please try again.");
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      ignore = true;
    };
  }, [logout, navigate, reloadSeed, userId]);

  const groupedInterests = useMemo(() => {
    const groups = new Map();

    interests.forEach((interest) => {
      const categoryName = interest.category_name || "More to explore";
      const existing = groups.get(categoryName) || [];
      existing.push(interest);
      groups.set(categoryName, existing);
    });

    return Array.from(groups.entries());
  }, [interests]);

  if (isLoading) {
    return (
      <div style={page}>
        <LoadingState
          title="Building your recommendations"
          description="We are matching your saved interests with clubs and upcoming events."
          className="max-w-[680px]"
        />
      </div>
    );
  }

  return (
    <div style={page}>
      <section style={heroCard}>
        <div style={heroHeader}>
          <div>
            <p style={eyebrow}>Quiz results</p>
            <h1 style={title}>Your personalized recommendations</h1>
            <p style={body}>
              Your saved quiz answers now shape the interests, clubs, and events shown here.
            </p>
          </div>
          <button
            type="button"
            style={secondaryButton}
            onClick={() => navigate("/onboarding", { state: { from: "/results" } })}
          >
            Update quiz answers
          </button>
        </div>

        {errorMessage ? (
          <Alert variant="error" className="mt-[length:var(--space-7)]">
            <div style={alertContent}>
              <span>{errorMessage}</span>
              <Button
                variant="secondary"
                onClick={() => setReloadSeed((current) => current + 1)}
                className="min-w-[120px]"
              >
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}
      </section>

      <div style={resultsGrid}>
        <section style={panel}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Suggested interests</h2>
            <span style={countPill}>{interests.length}</span>
          </div>

          {groupedInterests.length > 0 ? (
            <div style={stack}>
              {groupedInterests.map(([categoryName, items]) => (
                <div key={categoryName} style={groupCard}>
                  <p style={groupTitle}>{categoryName}</p>
                  <div style={chipWrap}>
                    {items.map((interest) => (
                      <span key={interest.interest_id} style={interestChip}>
                        {interest.interest_name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              align="left"
              title="No suggested interests yet"
              description="Save a few quiz answers to unlock suggested interests and stronger recommendations."
            />
          )}
        </section>

        <section style={panel}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Suggested clubs</h2>
            <span style={countPill}>{clubs.length}</span>
          </div>

          {clubs.length > 0 ? (
            <div style={stack}>
              {clubs.map((club) => (
                <article key={club.id} style={recommendationCard}>
                  <div style={cardTopRow}>
                    <h3 style={cardTitle}>{club.name}</h3>
                    <span style={scoreBadge}>Score {club.score}</span>
                  </div>
                  <p style={cardMeta}>
                    {club.category_name || "General"}
                    {club.city ? ` - ${club.city}` : ""}
                  </p>
                  <p style={cardBody}>
                    {club.description || "A club aligned with the interests you selected."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              align="left"
              title="No club matches yet"
              description="Add more interests or seed more club data to expand results."
            />
          )}
        </section>

        <section style={{ ...panel, gridColumn: "1 / -1" }}>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>Suggested events</h2>
            <span style={countPill}>{events.length}</span>
          </div>

          {events.length > 0 ? (
            <div style={eventGrid}>
              {events.map((event) => (
                <article key={event.id} style={recommendationCard}>
                  <div style={cardTopRow}>
                    <h3 style={cardTitle}>{event.title}</h3>
                    <span style={scoreBadge}>Score {event.score}</span>
                  </div>
                  <p style={cardMeta}>
                    {event.club_name || event.category_name || "Upcoming event"}
                    {event.start_time
                      ? ` - ${new Date(event.start_time).toLocaleString()}`
                      : ""}
                  </p>
                  <p style={cardBody}>
                    {event.description || "An event picked from the interests you selected."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              align="left"
              title="No event matches yet"
              description="The recommendations area is ready once matching data exists."
            />
          )}
        </section>
      </div>
    </div>
  );
}

const page = {
  width: "100%",
  maxWidth: "1080px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(14px, 3vw, 24px)",
};

const heroCard = {
  padding: "clamp(16px, 3.8vw, 32px)",
  borderRadius: "28px",
  background:
    "radial-gradient(circle at top right, rgba(249, 115, 22, 0.15), transparent 32%), linear-gradient(180deg, #fffdf8 0%, #fff7ed 100%)",
  border: "1px solid rgba(194, 65, 12, 0.12)",
  boxShadow: "0 24px 60px rgba(120, 53, 15, 0.08)",
};

const heroHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrow = {
  margin: 0,
  color: "#c2410c",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
};

const title = {
  margin: "10px 0 0 0",
  color: "#111827",
  fontSize: "clamp(2rem, 5vw, 4rem)",
  lineHeight: 1,
  maxWidth: "14ch",
};

const body = {
  margin: "14px 0 0 0",
  color: "#7c2d12",
  fontSize: "15px",
  maxWidth: "60ch",
};

const resultsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const panel = {
  padding: "clamp(14px, 3.5vw, 24px)",
  borderRadius: "24px",
  background: "white",
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: 700,
};

const countPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "34px",
  height: "34px",
  padding: "0 10px",
  borderRadius: "999px",
  background: "#fff7ed",
  color: "#c2410c",
  fontWeight: 700,
  fontSize: "13px",
};

const stack = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const groupCard = {
  padding: "16px",
  borderRadius: "18px",
  background: "#fffaf5",
  border: "1px solid #fed7aa",
};

const groupTitle = {
  margin: 0,
  color: "#9a3412",
  fontWeight: 700,
  fontSize: "14px",
};

const chipWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "12px",
};

const interestChip = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "white",
  border: "1px solid #fdba74",
  color: "#7c2d12",
  fontWeight: 600,
  fontSize: "13px",
};

const recommendationCard = {
  padding: "18px",
  borderRadius: "18px",
  background: "#fcfcfd",
  border: "1px solid #e5e7eb",
};

const cardTopRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const cardTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
};

const scoreBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#111827",
  color: "white",
  fontSize: "12px",
  fontWeight: 700,
};

const cardMeta = {
  margin: "10px 0 0 0",
  color: "#c2410c",
  fontSize: "13px",
  fontWeight: 600,
};

const cardBody = {
  margin: "12px 0 0 0",
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.5,
};

const eventGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const secondaryButton = {
  border: "1px solid rgba(17, 24, 39, 0.12)",
  borderRadius: "999px",
  background: "white",
  color: "#111827",
  fontWeight: 600,
  fontSize: "14px",
  padding: "12px 18px",
  cursor: "pointer",
};

const alertContent = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};
