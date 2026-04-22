import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Alert, Button, EmptyState, LoadingState } from "../components/ui/index.js";
import { INTERESTS_EMPTY_FOR_RECOMMENDATIONS } from "../lib/emptyStateMessages.js";

const CARD_ACCENT = [
  "linear-gradient(90deg, #fb7185, #f97316)",
  "linear-gradient(90deg, #6366f1, #8b5cf6)",
  "linear-gradient(90deg, #06b6d4, #3b82f6)",
  "linear-gradient(90deg, #10b981, #06b6d4)",
  "linear-gradient(90deg, #f59e0b, #ef4444)",
  "linear-gradient(90deg, #8b5cf6, #ec4899)",
];

/**
 * Full club directory from GET /clubs, with optional match scores from
 * GET /clubs/recommended when the user is authenticated.
 */
export default function Clubs() {
  const { userId } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [savedInterestCount, setSavedInterestCount] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setSavedInterestCount(null);

      try {
        const [allResult, categoriesResult, recommendedResult] =
          await Promise.allSettled([
            apiFetch("/clubs"),
            apiFetch("/interest-categories"),
            apiFetch("/clubs/recommended?limit=200"),
          ]);

        if (ignore) return;

        if (allResult.status !== "fulfilled") {
          throw allResult.reason;
        }

        const allClubs = Array.isArray(allResult.value) ? allResult.value : [];

        const scored =
          recommendedResult.status === "fulfilled" &&
          Array.isArray(recommendedResult.value)
            ? recommendedResult.value
            : [];

        const scoreById = new Map();
        scored.forEach((club) => {
          scoreById.set(club.id, club.score ?? 0);
        });

        const ranked = allClubs
          .map((club) => ({ ...club, score: scoreById.get(club.id) ?? 0 }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.name || "").localeCompare(b.name || "", undefined, {
              sensitivity: "base",
            });
          });

        setClubs(ranked);
        setCategories(
          categoriesResult.status === "fulfilled" &&
            Array.isArray(categoriesResult.value)
            ? categoriesResult.value
            : []
        );

        let interestCount = null;
        if (userId) {
          try {
            const rawInterests = await apiFetch(`/users/${userId}/interests`);
            interestCount = Array.isArray(rawInterests) ? rawInterests.length : 0;
          } catch {
            interestCount = 0;
          }
        }
        if (!ignore) {
          setSavedInterestCount(interestCount);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message || "Could not load clubs.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, [userId]);

  const filteredClubs = useMemo(() => {
    if (!selectedCategoryId) return clubs;
    return clubs.filter((club) => club.category_id === selectedCategoryId);
  }, [clubs, selectedCategoryId]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Clubs</h1>
          <p style={styles.subtitle}>
            {isLoading
              ? "Loading the full directory…"
              : `${clubs.length} club${clubs.length === 1 ? "" : "s"} from the directory`}
            {selectedCategoryId && !isLoading
              ? ` · ${filteredClubs.length} in this category`
              : null}
          </p>
        </div>
      </header>

      {userId &&
      savedInterestCount !== null &&
      savedInterestCount === 0 &&
      !isLoading ? (
        <div style={styles.interestsCallout}>
          <EmptyState
            align="left"
            title="Match scores need your interests"
            description={INTERESTS_EMPTY_FOR_RECOMMENDATIONS}
            action={
              <Button asChild variant="secondary">
                <Link to="/interests">Choose interests</Link>
              </Button>
            }
          />
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div style={styles.chipScroller} role="tablist" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("")}
            style={{
              ...styles.chip,
              ...(selectedCategoryId === "" ? styles.chipActive : null),
            }}
            role="tab"
            aria-selected={selectedCategoryId === ""}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategoryId(category.id)}
              style={{
                ...styles.chip,
                ...(selectedCategoryId === category.id ? styles.chipActive : null),
              }}
              role="tab"
              aria-selected={selectedCategoryId === category.id}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      {errorMessage ? (
        <div style={styles.alertWrap}>
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <div style={styles.stateWrap}>
          <LoadingState
            align="center"
            title="Loading clubs"
            description="Fetching every club from GET /clubs."
          />
        </div>
      ) : filteredClubs.length === 0 ? (
        <div style={styles.stateWrap}>
          <EmptyState
            align="center"
            title={
              clubs.length === 0 ? "No clubs in the directory yet" : "No clubs in this category"
            }
            description={
              clubs.length === 0
                ? "Once clubs are added to the API, they will show up here."
                : "Try another category or clear the filter."
            }
          />
        </div>
      ) : (
        <ul style={styles.grid} aria-label="Club directory">
          {filteredClubs.map((club, index) => (
            <li key={club.id} style={styles.gridItem}>
              <article className="jeal-card-interactive" style={styles.card}>
                <div
                  style={{
                    ...styles.cardAccent,
                    background: CARD_ACCENT[index % CARD_ACCENT.length],
                  }}
                  aria-hidden
                />
                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    {club.category_name ? (
                      <span style={styles.categoryBadge}>{club.category_name}</span>
                    ) : null}
                    {club.score > 0 ? (
                      <span style={styles.scoreBadge} title="Match score from your interests">
                        ★ {club.score}
                      </span>
                    ) : null}
                  </div>
                  <h2 style={styles.cardTitle}>{club.name}</h2>
                  <p style={styles.cardDescription}>
                    {club.description || "No description yet."}
                  </p>
                  <div style={styles.metaRow}>
                    {club.city ? (
                      <span style={styles.metaPill}>📍 {club.city}</span>
                    ) : null}
                    {club.location ? (
                      <span style={styles.metaPill}>🏛 {club.location}</span>
                    ) : null}
                  </div>
                  <div style={styles.linkRow}>
                    <Link to={`/clubs/${club.id}`} style={styles.detailsLink}>
                      View details →
                    </Link>
                    {club.website_url ? (
                      <a
                        href={club.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.externalLink}
                      >
                        Website ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "16px clamp(12px, 3vw, 24px) 48px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    margin: 0,
    color: "#111827",
    fontSize: "clamp(24px, 4vw, 32px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: 600,
  },
  interestsCallout: {
    width: "100%",
  },
  chipScroller: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    padding: "4px 0 8px 0",
    scrollbarWidth: "thin",
    WebkitOverflowScrolling: "touch",
  },
  chip: {
    flex: "0 0 auto",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(17, 24, 39, 0.12)",
    background: "white",
    color: "#374151",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  chipActive: {
    background: "#111827",
    color: "white",
    borderColor: "#111827",
  },
  alertWrap: {
    maxWidth: "640px",
  },
  stateWrap: {
    padding: "48px 0",
    minHeight: "240px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },
  gridItem: {
    minWidth: 0,
  },
  card: {
    height: "100%",
    borderRadius: "20px",
    border: "1px solid #e5e7eb",
    background: "white",
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardAccent: {
    height: "4px",
    width: "100%",
    flexShrink: 0,
  },
  cardBody: {
    padding: "18px 18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
    minHeight: 0,
  },
  cardTop: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    justifyContent: "space-between",
  },
  categoryBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "999px",
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  scoreBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "999px",
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "11px",
    fontWeight: 800,
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.25,
  },
  cardDescription: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#4b5563",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    flex: 1,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  metaPill: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
  },
  linkRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
    marginTop: "4px",
  },
  detailsLink: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1d4ed8",
    textDecoration: "none",
  },
  externalLink: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    textDecoration: "none",
  },
};
