import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  createJoinedClubIdSet,
  emitClubMembershipChanged,
  fetchJoinedClubs,
  subscribeToClubMembershipChanges,
} from "../lib/clubMemberships.js";
import { Alert, Button, EmptyState, LoadingState } from "../components/ui/index.js";
import { INTERESTS_EMPTY_FOR_RECOMMENDATIONS } from "../lib/emptyStateMessages.js";

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #fb7185 0%, #f97316 50%, #facc15 100%)",
  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)",
  "linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #db2777 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)",
];

/**
 * Full club directory rendered as a TikTok/Tinder-style vertical scroll-snap
 * feed. Cards are ordered by recommendation score (when the user has saved
 * interests) and fall back to alphabetical ordering.
 */
export default function Clubs() {
  const { userId } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedInterestCount, setSavedInterestCount] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [skippedIds, setSkippedIds] = useState(() => new Set());
  const [joinedClubIds, setJoinedClubIds] = useState(() => new Set());
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(true);
  const [membershipErrorMessage, setMembershipErrorMessage] = useState("");
  const [pendingMembershipClubId, setPendingMembershipClubId] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const scrollerRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setIsLoading(true);
      setIsLoadingMemberships(true);
      setErrorMessage("");
      setMembershipErrorMessage("");
      setSavedInterestCount(null);

      try {
        const [allResult, categoriesResult, recommendedResult, joinedClubsResult] =
          await Promise.allSettled([
            apiFetch("/clubs"),
            apiFetch("/interest-categories"),
            apiFetch("/clubs/recommended?limit=200"),
            userId ? fetchJoinedClubs(userId) : Promise.resolve([]),
          ]);

        if (ignore) return;

        if (allResult.status !== "fulfilled") {
          throw allResult.reason;
        }

        const allClubs = (Array.isArray(allResult.value) ? allResult.value : [])
          .filter((club) => club.is_active !== false);

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
        setJoinedClubIds(
          joinedClubsResult.status === "fulfilled"
            ? createJoinedClubIdSet(joinedClubsResult.value)
            : new Set()
        );
        if (joinedClubsResult.status === "rejected") {
          setMembershipErrorMessage(
            joinedClubsResult.reason?.message ||
              "Could not load your club memberships."
          );
        }

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
        if (!ignore) {
          setIsLoading(false);
          setIsLoadingMemberships(false);
        }
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, [userId]);

  useEffect(
    () =>
      subscribeToClubMembershipChanges(({ type, clubId, club }) => {
        const normalizedClubId = String(clubId);

        setJoinedClubIds((prev) => {
          const next = new Set(prev);
          if (type === "joined") next.add(normalizedClubId);
          if (type === "left") next.delete(normalizedClubId);
          return next;
        });

        setClubs((prev) =>
          prev.map((item) => {
            if (String(item.id) !== normalizedClubId) return item;
            if (club?.id) return { ...item, ...club };
            if (type === "left") {
              return {
                ...item,
                member_count: Math.max(0, (item.member_count || 0) - 1),
              };
            }
            return item;
          })
        );

        setMembershipErrorMessage("");
      }),
    []
  );

  const filteredClubs = useMemo(() => {
    if (!selectedCategoryId) return clubs;
    return clubs.filter((club) => club.category_id === selectedCategoryId);
  }, [clubs, selectedCategoryId]);

  useEffect(() => {
    setActiveIndex(0);
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const handleScroll = () => {
      const cards = cardRefs.current.filter(Boolean);
      if (cards.length === 0) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const center = scrollerRect.top + scrollerRect.height / 2;

      let bestIndex = 0;
      let bestDistance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      setActiveIndex(bestIndex);
    };

    handleScroll();
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, [filteredClubs.length]);

  useEffect(() => {
    if (!feedbackToast) return undefined;
    const id = setTimeout(() => setFeedbackToast(null), 1200);
    return () => clearTimeout(id);
  }, [feedbackToast]);

  const scrollToCard = (index) => {
    const card = cardRefs.current[index];
    if (card && scrollerRef.current) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        scrollToCard(Math.min(activeIndex + 1, filteredClubs.length - 1));
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        scrollToCard(Math.max(activeIndex - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, filteredClubs.length]);

  const handleLike = (club) => {
    const wasLiked = likedIds.has(club.id);

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(club.id);
      } else {
        next.add(club.id);
      }
      return next;
    });

    if (wasLiked) {
      setFeedbackToast({ kind: "like-undo", clubId: club.id });
      return;
    }

    setSkippedIds((prev) => {
      if (!prev.has(club.id)) return prev;
      const next = new Set(prev);
      next.delete(club.id);
      return next;
    });
    setFeedbackToast({ kind: "like", clubId: club.id });
    setTimeout(() => {
      const nextIndex = filteredClubs.findIndex((c) => c.id === club.id) + 1;
      if (nextIndex < filteredClubs.length) scrollToCard(nextIndex);
    }, 250);
  };

  const handleSkip = (club) => {
    const wasSkipped = skippedIds.has(club.id);

    setSkippedIds((prev) => {
      const next = new Set(prev);
      if (wasSkipped) {
        next.delete(club.id);
      } else {
        next.add(club.id);
      }
      return next;
    });

    if (wasSkipped) {
      setFeedbackToast({ kind: "skip-undo", clubId: club.id });
      return;
    }

    setLikedIds((prev) => {
      if (!prev.has(club.id)) return prev;
      const next = new Set(prev);
      next.delete(club.id);
      return next;
    });
    setFeedbackToast({ kind: "skip", clubId: club.id });
    setTimeout(() => {
      const nextIndex = filteredClubs.findIndex((c) => c.id === club.id) + 1;
      if (nextIndex < filteredClubs.length) scrollToCard(nextIndex);
    }, 250);
  };

  const handleToggleMembership = async (club) => {
    if (!userId) return;

    const normalizedClubId = String(club.id);
    const isJoined = joinedClubIds.has(normalizedClubId);

    setPendingMembershipClubId(club.id);
    setMembershipErrorMessage("");

    try {
      if (isJoined) {
        await apiFetch(`/clubs/${club.id}/join`, { method: "DELETE" });
        setJoinedClubIds((prev) => {
          const next = new Set(prev);
          next.delete(normalizedClubId);
          return next;
        });
        const updatedClub = {
          ...club,
          member_count: Math.max(0, (club.member_count || 0) - 1),
        };
        setClubs((prev) =>
          prev.map((item) =>
            String(item.id) === normalizedClubId ? { ...item, ...updatedClub } : item
          )
        );
        emitClubMembershipChanged({ type: "left", clubId: club.id, club: updatedClub });
      } else {
        const joinedClub = await apiFetch(`/clubs/${club.id}/join`, {
          method: "POST",
        });
        setJoinedClubIds((prev) => new Set(prev).add(normalizedClubId));
        setClubs((prev) =>
          prev.map((item) =>
            String(item.id) === normalizedClubId ? { ...item, ...joinedClub } : item
          )
        );
        emitClubMembershipChanged({
          type: "joined",
          clubId: club.id,
          club: joinedClub,
        });
      }
    } catch (error) {
      setMembershipErrorMessage(
        error.message || "Could not update your club membership."
      );
    } finally {
      setPendingMembershipClubId(null);
    }
  };

  const hasActiveFilters = Boolean(selectedCategoryId);

  const handleClearFilters = () => {
    setSelectedCategoryId("");
  };

  return (
    <div style={styles.fullBleed}>
      <div style={styles.topBar}>
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>Discover Clubs</h1>
          <p style={styles.subtitle}>
            Swipe up to explore · {joinedClubIds.size} joined · {likedIds.size} liked
          </p>
        </div>

        {filteredClubs.length > 0 && !isLoading ? (
          <div style={styles.counter} aria-live="polite">
            <span style={styles.counterCurrent}>{activeIndex + 1}</span>
            <span style={styles.counterDivider}>/</span>
            <span>{filteredClubs.length}</span>
          </div>
        ) : null}
      </div>

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
        <div style={styles.filterGroup} aria-label="Category filters">
          <div style={styles.filterGroupHeader}>
            <span style={styles.filterGroupLabel}>Category</span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                style={styles.clearLink}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div style={styles.chipScroller} role="tablist">
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
        </div>
      ) : null}

      {errorMessage ? (
        <div style={styles.alertWrap}>
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      ) : null}

      {membershipErrorMessage ? (
        <div style={styles.alertWrap}>
          <Alert variant="error">{membershipErrorMessage}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <div style={styles.stateWrap}>
          <LoadingState
            align="center"
            title="Loading clubs"
            description="Fetching every club from the directory."
          />
        </div>
      ) : filteredClubs.length === 0 ? (
        <div style={styles.stateWrap}>
          <EmptyState
            align="center"
            title={
              clubs.length === 0
                ? "No clubs in the directory yet"
                : "No clubs in this category"
            }
            description={
              clubs.length === 0
                ? "Once clubs are added, they will appear here."
                : "Try another category or clear the filter."
            }
          />
        </div>
      ) : (
        <div ref={scrollerRef} style={styles.scroller}>
          {filteredClubs.map((club, index) => {
            const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
            const isLiked = likedIds.has(club.id);
            const isSkipped = skippedIds.has(club.id);
            const isJoined = joinedClubIds.has(String(club.id));
            const isActive = index === activeIndex;
            const isToastForThis = feedbackToast?.clubId === club.id;
            const initial = (club.name || "?").trim().charAt(0).toUpperCase();

            return (
              <section
                key={club.id}
                ref={(el) => (cardRefs.current[index] = el)}
                style={styles.cardSlot}
                aria-label={`${club.name}, card ${index + 1} of ${filteredClubs.length}`}
              >
                <article
                  style={{
                    ...styles.card,
                    ...(club.image_url
                      ? {
                          backgroundImage: `url(${club.image_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : { background: gradient }),
                    transform: isActive ? "scale(1)" : "scale(0.96)",
                    opacity: isActive ? 1 : 0.85,
                    filter: isSkipped ? "grayscale(0.6)" : "none",
                  }}
                >
                  <div
                    style={{
                      ...styles.cardOverlay,
                      ...(club.image_url
                        ? {
                            background:
                              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.72) 100%)",
                          }
                        : null),
                    }}
                    aria-hidden="true"
                  />

                  <div style={styles.cardContent}>
                    <div style={styles.cardTopRow}>
                      <div
                        style={styles.monogramBadge}
                        aria-label={`${club.name} initial`}
                      >
                        <span style={styles.monogramMain}>{initial}</span>
                        {club.city ? (
                          <span style={styles.monogramSub}>{club.city}</span>
                        ) : null}
                      </div>
                      <div style={styles.topBadgeStack}>
                        {club.score > 0 ? (
                          <span
                            style={styles.scoreBadge}
                            title="Match score based on your interests"
                          >
                            ★ Match {club.score}
                          </span>
                        ) : null}
                        {isLiked ? (
                          <span style={styles.likedBadge}>♥ Liked</span>
                        ) : null}
                        {isJoined ? (
                          <span style={styles.joinedBadge}>Joined</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={styles.cardMain}>
                      {club.category_name ? (
                        <span style={styles.categoryBadge}>
                          {club.category_name}
                        </span>
                      ) : null}
                      <h2 style={styles.cardTitle}>{club.name}</h2>
                      <p style={styles.cardDescription}>
                        {club.description || "No description provided yet."}
                      </p>

                      <div style={styles.metaRow}>
                        {club.city ? (
                          <span style={styles.metaPill}>📍 {club.city}</span>
                        ) : null}
                        {club.location ? (
                          <span style={styles.metaPill}>🏛 {club.location}</span>
                        ) : null}
                        <span style={styles.metaPill}>
                          {club.member_count === 1
                            ? "1 member"
                            : `${club.member_count || 0} members`}
                        </span>
                      </div>

                      <div style={styles.linkRow}>
                        <button
                          type="button"
                          onClick={() => handleToggleMembership(club)}
                          disabled={
                            pendingMembershipClubId === club.id ||
                            isLoadingMemberships
                          }
                          style={{
                            ...styles.membershipButton,
                            ...(isJoined
                              ? styles.membershipButtonJoined
                              : styles.membershipButtonPrimary),
                          }}
                        >
                          {pendingMembershipClubId === club.id
                            ? "Saving..."
                            : isLoadingMemberships
                              ? "Checking..."
                              : isJoined
                                ? "Leave club"
                                : "Join club"}
                        </button>
                        <Link to={`/clubs/${club.id}`} style={styles.detailsButton}>
                          View details →
                        </Link>
                        {club.website_url ? (
                          <a
                            href={club.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.websiteButton}
                          >
                            Visit website ↗
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div style={styles.cardBottomRow}>
                      <p style={styles.scrollHint}>
                        {index < filteredClubs.length - 1
                          ? "Scroll down for more ↓"
                          : "You've reached the end ✨"}
                      </p>
                    </div>
                  </div>

                  <div style={styles.actionRail} aria-label="Card actions">
                    <button
                      type="button"
                      onClick={() => handleSkip(club)}
                      style={{
                        ...styles.actionButton,
                        ...(isSkipped ? styles.actionButtonSkippedActive : null),
                      }}
                      aria-label={isSkipped ? "Undo skip" : "Skip this club"}
                      aria-pressed={isSkipped}
                      title={isSkipped ? "Undo skip" : "Skip"}
                    >
                      <span style={styles.actionGlyph}>✕</span>
                      <span style={styles.actionLabel}>
                        {isSkipped ? "Undo" : "Skip"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLike(club)}
                      style={{
                        ...styles.actionButton,
                        ...(isLiked ? styles.actionButtonLikedActive : null),
                      }}
                      aria-label={isLiked ? "Remove like" : "Like this club"}
                      aria-pressed={isLiked}
                      title={isLiked ? "Undo like" : "Like"}
                    >
                      <span style={styles.actionGlyph}>♥</span>
                      <span style={styles.actionLabel}>
                        {isLiked ? "Undo" : "Like"}
                      </span>
                    </button>

                    {club.website_url ? (
                      <a
                        href={club.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.actionButton}
                        aria-label="Open club website"
                        title="Website"
                      >
                        <span style={styles.actionGlyph}>↗</span>
                        <span style={styles.actionLabel}>Site</span>
                      </a>
                    ) : null}
                  </div>

                  {isToastForThis ? (
                    <div
                      style={{
                        ...styles.toast,
                        ...(feedbackToast.kind === "like" ||
                        feedbackToast.kind === "like-undo"
                          ? styles.toastLike
                          : styles.toastSkip),
                      }}
                      aria-hidden="true"
                    >
                      {feedbackToast.kind === "like"
                        ? "♥ Liked"
                        : feedbackToast.kind === "like-undo"
                          ? "Undo Like"
                          : feedbackToast.kind === "skip-undo"
                            ? "Undo Skip"
                            : "Skipped"}
                    </div>
                  ) : null}
                </article>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SCROLLER_HEIGHT = "calc(100dvh - 220px)";
const CARD_RADIUS = "28px";

const styles = {
  fullBleed: {
    width: "100%",
    maxWidth: "560px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "16px",
    flexWrap: "wrap",
    padding: "0 4px",
  },
  interestsCallout: {
    width: "100%",
    padding: "0 4px",
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  title: {
    margin: 0,
    color: "#111827",
    fontSize: "26px",
    fontWeight: 800,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: 600,
  },
  counter: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "2px",
    padding: "6px 14px",
    borderRadius: "999px",
    background: "rgba(17, 24, 39, 0.9)",
    color: "white",
    fontSize: "13px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  counterCurrent: {
    fontSize: "16px",
    fontWeight: 800,
  },
  counterDivider: {
    opacity: 0.6,
    margin: "0 2px",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "0 4px",
  },
  filterGroupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterGroupLabel: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  clearLink: {
    border: "none",
    background: "transparent",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  chipScroller: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    padding: "2px 0 6px 0",
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
    transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  chipActive: {
    background: "#111827",
    color: "white",
    borderColor: "#111827",
  },
  alertWrap: {
    padding: "0 4px",
  },
  stateWrap: {
    padding: "60px 4px",
    minHeight: SCROLLER_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  scroller: {
    height: SCROLLER_HEIGHT,
    overflowY: "auto",
    scrollSnapType: "y mandatory",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    borderRadius: CARD_RADIUS,
    WebkitOverflowScrolling: "touch",
  },
  cardSlot: {
    height: SCROLLER_HEIGHT,
    scrollSnapAlign: "start",
    scrollSnapStop: "always",
    padding: 0,
    boxSizing: "border-box",
  },
  card: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.25)",
    color: "white",
    display: "flex",
    transition: "transform 0.25s ease, opacity 0.25s ease, filter 0.3s ease",
  },
  cardOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.55) 100%)",
    pointerEvents: "none",
  },
  cardContent: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px 96px 24px 20px",
    boxSizing: "border-box",
    minWidth: 0,
  },
  cardTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },
  monogramBadge: {
    display: "flex",
    flexDirection: "column",
    padding: "8px 14px",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.97)",
    color: "#111827",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
    minWidth: "70px",
    alignItems: "flex-start",
  },
  monogramMain: {
    fontSize: "20px",
    fontWeight: 900,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  },
  monogramSub: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#4b5563",
    marginTop: "4px",
  },
  topBadgeStack: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    alignItems: "flex-end",
  },
  likedBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.95)",
    color: "#dc2626",
    fontSize: "11px",
    fontWeight: 800,
  },
  joinedBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(16, 185, 129, 0.92)",
    color: "#042f2e",
    fontSize: "11px",
    fontWeight: 800,
  },
  scoreBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(250, 204, 21, 0.95)",
    color: "#111827",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  cardMain: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "auto",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 12px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.22)",
    backdropFilter: "blur(8px)",
    color: "white",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  cardTitle: {
    margin: 0,
    fontSize: "clamp(28px, 6vw, 38px)",
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    textShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
  },
  cardDescription: {
    margin: 0,
    fontSize: "15px",
    lineHeight: 1.55,
    color: "rgba(255, 255, 255, 0.95)",
    textShadow: "0 1px 6px rgba(0, 0, 0, 0.25)",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "rgba(0, 0, 0, 0.35)",
    backdropFilter: "blur(6px)",
    color: "white",
    fontSize: "12px",
    fontWeight: 600,
  },
  linkRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
  },
  membershipButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 16px",
    borderRadius: "999px",
    border: "1px solid transparent",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
  },
  membershipButtonPrimary: {
    background: "#111827",
    color: "white",
  },
  membershipButtonJoined: {
    background: "rgba(255, 255, 255, 0.95)",
    color: "#111827",
    borderColor: "rgba(255, 255, 255, 0.75)",
  },
  detailsButton: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: "999px",
    background: "#111827",
    color: "white",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
  },
  websiteButton: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: "999px",
    background: "white",
    color: "#111827",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)",
  },
  cardBottomRow: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "center",
  },
  scrollHint: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    color: "rgba(255, 255, 255, 0.85)",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },
  actionRail: {
    position: "absolute",
    right: "16px",
    bottom: "24px",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "center",
  },
  actionButton: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(255, 255, 255, 0.18)",
    backdropFilter: "blur(10px)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
    textDecoration: "none",
    transition: "transform 0.15s ease, background 0.15s ease",
  },
  actionButtonLikedActive: {
    background: "white",
    color: "#dc2626",
    transform: "scale(1.05)",
  },
  actionButtonSkippedActive: {
    background: "rgba(0, 0, 0, 0.55)",
    transform: "scale(0.95)",
  },
  actionGlyph: {
    fontSize: "22px",
    lineHeight: 1,
  },
  actionLabel: {
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  toast: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) scale(1)",
    padding: "14px 26px",
    borderRadius: "999px",
    fontSize: "20px",
    fontWeight: 900,
    letterSpacing: "0.04em",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
    zIndex: 3,
    pointerEvents: "none",
  },
  toastLike: {
    background: "rgba(255, 255, 255, 0.97)",
    color: "#dc2626",
    border: "3px solid #dc2626",
  },
  toastSkip: {
    background: "rgba(17, 24, 39, 0.92)",
    color: "white",
    border: "3px solid rgba(255, 255, 255, 0.6)",
  },
};
