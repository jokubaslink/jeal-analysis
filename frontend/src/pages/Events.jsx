import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  createRegisteredEventIdSet,
  createWaitlistedEventIdSet,
  emitEventRegistrationChanged,
  fetchRegisteredEvents,
  fetchWaitlistedEvents,
  subscribeToEventRegistrationChanges,
} from "../lib/eventRegistrations.js";
import {
  createSavedEventIdSet,
  emitSavedItemChanged,
  fetchSavedEvents,
} from "../lib/savedItems.js";
import { isEventPast } from "../lib/eventTime.js";
import EventLocationsMap from "../components/EventLocationsMap.jsx";
import { Alert, Button, EmptyState, LoadingState } from "../components/ui/index.js";
import { INTERESTS_EMPTY_FOR_RECOMMENDATIONS } from "../lib/emptyStateMessages.js";

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)",
  "linear-gradient(135deg, #f43f5e 0%, #f97316 50%, #facc15 100%)",
  "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0ea5e9 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #f43f5e 100%)",
  "linear-gradient(135deg, #facc15 0%, #f97316 50%, #ef4444 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #db2777 100%)",
];

const DATE_PRESETS = [
  { id: "all", label: "All upcoming" },
  { id: "today", label: "Today" },
  { id: "week", label: "Next 7 days" },
  { id: "month", label: "Next 30 days" },
  { id: "custom", label: "Custom range" },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValue(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatEventDateLong(value) {
  if (!value) return "Date to be announced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date to be announced";
  return parsed.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEventDateShort(value) {
  if (!value) return "TBA";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBA";
  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTimeRange(start, end) {
  if (!start) return "";
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "";
  const sLabel = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (!end) return sLabel;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return sLabel;
  const eLabel = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${sLabel} – ${eLabel}`;
}

export default function Events() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedInterestCount, setSavedInterestCount] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState(toDateInputValue(new Date()));
  const [customTo, setCustomTo] = useState(toDateInputValue(addDays(new Date(), 30)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [registeredEventIds, setRegisteredEventIds] = useState(() => new Set());
  const [waitlistedEventIds, setWaitlistedEventIds] = useState(() => new Set());
  const [skippedIds, setSkippedIds] = useState(() => new Set());
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(true);
  const [registrationErrorMessage, setRegistrationErrorMessage] = useState("");
  const [pendingRegistrationEventId, setPendingRegistrationEventId] = useState(null);
  const [savedEventIds, setSavedEventIds] = useState(() => new Set());
  const [isLoadingSavedEvents, setIsLoadingSavedEvents] = useState(true);
  const [pendingSavedEventId, setPendingSavedEventId] = useState(null);
  const [savedEventsErrorMessage, setSavedEventsErrorMessage] = useState("");
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const scrollerRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setIsLoading(true);
      setIsLoadingRegistrations(true);
      setIsLoadingSavedEvents(true);
      setErrorMessage("");
      setRegistrationErrorMessage("");
      setSavedEventsErrorMessage("");
      setSavedInterestCount(null);

      try {
        const [
          recommendedResult,
          allResult,
          categoriesResult,
          registeredEventsResult,
          waitlistedEventsResult,
          savedEventsResult,
        ] =
          await Promise.allSettled([
            apiFetch("/events/recommended?limit=50"),
            apiFetch("/events"),
            apiFetch("/interest-categories"),
            userId ? fetchRegisteredEvents(userId) : Promise.resolve([]),
            userId ? fetchWaitlistedEvents(userId) : Promise.resolve([]),
            userId ? fetchSavedEvents(userId) : Promise.resolve([]),
          ]);

        if (ignore) return;

        if (allResult.status !== "fulfilled") {
          throw allResult.reason;
        }

        const allEvents = Array.isArray(allResult.value) ? allResult.value : [];

        const scored =
          recommendedResult.status === "fulfilled" &&
          Array.isArray(recommendedResult.value)
            ? recommendedResult.value
            : [];

        const recommendationById = new Map();
        scored.forEach((event) => {
          recommendationById.set(event.id, {
            score: event.score ?? 0,
            recommendation_explanation: event.recommendation_explanation || "",
          });
        });

        const ranked = allEvents
          .map((event) => ({
            ...event,
            score: recommendationById.get(event.id)?.score ?? 0,
            recommendation_explanation:
              recommendationById.get(event.id)?.recommendation_explanation ||
              event.recommendation_explanation ||
              "",
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const aTime = a.start_time ? new Date(a.start_time).getTime() : Infinity;
            const bTime = b.start_time ? new Date(b.start_time).getTime() : Infinity;
            return aTime - bTime;
          });

        setEvents(ranked);
        setCategories(
          categoriesResult.status === "fulfilled" &&
            Array.isArray(categoriesResult.value)
            ? categoriesResult.value
            : []
        );
        setRegisteredEventIds(
          registeredEventsResult.status === "fulfilled"
            ? createRegisteredEventIdSet(registeredEventsResult.value)
            : new Set()
        );
        setWaitlistedEventIds(
          waitlistedEventsResult.status === "fulfilled"
            ? createWaitlistedEventIdSet(waitlistedEventsResult.value)
            : new Set()
        );
        setSavedEventIds(
          savedEventsResult.status === "fulfilled"
            ? createSavedEventIdSet(savedEventsResult.value)
            : new Set()
        );
        if (registeredEventsResult.status === "rejected") {
          setRegistrationErrorMessage(
            registeredEventsResult.reason?.message ||
              "Could not load your event registrations."
          );
        }
        if (waitlistedEventsResult.status === "rejected") {
          setRegistrationErrorMessage(
            waitlistedEventsResult.reason?.message ||
              "Could not load your event waitlist status."
          );
        }
        if (savedEventsResult.status === "rejected") {
          setSavedEventsErrorMessage(
            savedEventsResult.reason?.message || "Could not load your saved events."
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
          setErrorMessage(error.message || "Could not load events.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsLoadingRegistrations(false);
          setIsLoadingSavedEvents(false);
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
      subscribeToEventRegistrationChanges(({ type, eventId, event }) => {
        const normalizedEventId = String(eventId);

        setRegisteredEventIds((prev) => {
          const next = new Set(prev);
          if (type === "registered") next.add(normalizedEventId);
          if (type === "unregistered") next.delete(normalizedEventId);
          if (type === "waitlisted") next.delete(normalizedEventId);
          return next;
        });

        setWaitlistedEventIds((prev) => {
          const next = new Set(prev);
          if (type === "waitlisted") next.add(normalizedEventId);
          if (type === "registered" || type === "unregistered") next.delete(normalizedEventId);
          return next;
        });

        setEvents((prev) =>
          prev.map((item) => {
            if (String(item.id) !== normalizedEventId) return item;
            if (event?.id) return { ...item, ...event };
            return item;
          })
        );

        setRegistrationErrorMessage("");
      }),
    []
  );

  const dateRange = useMemo(() => {
    const now = new Date();
    if (datePreset === "today") {
      return { from: startOfDay(now), to: endOfDay(now) };
    }
    if (datePreset === "week") {
      return { from: startOfDay(now), to: endOfDay(addDays(now, 7)) };
    }
    if (datePreset === "month") {
      return { from: startOfDay(now), to: endOfDay(addDays(now, 30)) };
    }
    if (datePreset === "custom") {
      const from = customFrom ? startOfDay(new Date(customFrom)) : null;
      const to = customTo ? endOfDay(new Date(customTo)) : null;
      return { from, to };
    }
    return { from: null, to: null };
  }, [datePreset, customFrom, customTo]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = events.filter((event) => {
      if (
        registeredEventIds.has(String(event.id)) ||
        waitlistedEventIds.has(String(event.id)) ||
        skippedIds.has(event.id)
      ) {
        return false;
      }
      if (!showPastEvents && isEventPast(event)) {
        return false;
      }
      if (selectedCategoryId && event.category_id !== selectedCategoryId) {
        return false;
      }
      if (event.start_time) {
        const start = new Date(event.start_time);
        if (Number.isNaN(start.getTime())) return false;
        if (dateRange.from && start < dateRange.from) return false;
        if (dateRange.to && start > dateRange.to) return false;
      } else if (dateRange.from || dateRange.to) {
        return false;
      }
      if (q) {
        const matches =
          (event.title || "").toLowerCase().includes(q) ||
          (event.description || "").toLowerCase().includes(q) ||
          (event.category_name || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
    if (!showPastEvents) {
      return list;
    }
    return [...list].sort((a, b) => {
      const aPast = isEventPast(a);
      const bPast = isEventPast(b);
      if (aPast !== bPast) return aPast ? 1 : -1;
      const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
      return aTime - bTime;
    });
  }, [
    events,
    registeredEventIds,
    waitlistedEventIds,
    skippedIds,
    selectedCategoryId,
    dateRange,
    showPastEvents,
    searchQuery,
  ]);

  const allLoadedArePast =
    events.length > 0 && events.every((event) => isEventPast(event));

  useEffect(() => {
    setActiveIndex(0);
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [selectedCategoryId, datePreset, customFrom, customTo, showPastEvents, searchQuery]);

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
  }, [filteredEvents.length]);

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
        scrollToCard(Math.min(activeIndex + 1, filteredEvents.length - 1));
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        scrollToCard(Math.max(activeIndex - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, filteredEvents.length]);

  const handleToggleRegistration = async (event) => {
    if (!userId) return;

    const normalizedEventId = String(event.id);
    const isRegistered = registeredEventIds.has(normalizedEventId);
    const isWaitlisted = waitlistedEventIds.has(normalizedEventId);

    setPendingRegistrationEventId(event.id);
    setRegistrationErrorMessage("");

    try {
      if (isRegistered || isWaitlisted) {
        const updatedEvent = await apiFetch(`/events/${event.id}/register`, { method: "DELETE" });
        setRegisteredEventIds((prev) => {
          const next = new Set(prev);
          next.delete(normalizedEventId);
          return next;
        });
        setWaitlistedEventIds((prev) => {
          const next = new Set(prev);
          next.delete(normalizedEventId);
          return next;
        });
        setEvents((prev) =>
          prev.map((item) =>
            String(item.id) === normalizedEventId ? { ...item, ...updatedEvent } : item
          )
        );
        emitEventRegistrationChanged({
          type: "unregistered",
          eventId: event.id,
          event: updatedEvent,
        });
        setFeedbackToast({
          kind: isWaitlisted ? "waitlist-undo" : "interested-undo",
          eventId: event.id,
        });
        return;
      }

      const registeredEvent = await apiFetch(`/events/${event.id}/register`, {
        method: "POST",
      });
      const status = registeredEvent.registration_status || "registered";
      if (status === "waitlisted") {
        setWaitlistedEventIds((prev) => new Set(prev).add(normalizedEventId));
        setRegisteredEventIds((prev) => {
          const next = new Set(prev);
          next.delete(normalizedEventId);
          return next;
        });
      } else {
        setRegisteredEventIds((prev) => new Set(prev).add(normalizedEventId));
        setWaitlistedEventIds((prev) => {
          const next = new Set(prev);
          next.delete(normalizedEventId);
          return next;
        });
      }
      setEvents((prev) =>
        prev.map((item) =>
          String(item.id) === normalizedEventId ? { ...item, ...registeredEvent } : item
        )
      );
      setSkippedIds((prev) => {
        if (!prev.has(event.id)) return prev;
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
      emitEventRegistrationChanged({
        type: status === "waitlisted" ? "waitlisted" : "registered",
        eventId: event.id,
        event: registeredEvent,
      });
      setFeedbackToast({
        kind: status === "waitlisted" ? "waitlisted" : "interested",
        eventId: event.id,
      });
      setTimeout(() => {
        const nextIndex = filteredEvents.findIndex((e) => e.id === event.id) + 1;
        if (nextIndex < filteredEvents.length) scrollToCard(nextIndex);
      }, 250);
    } catch (error) {
      setRegistrationErrorMessage(
        error.message || "Could not update your event registration."
      );
    } finally {
      setPendingRegistrationEventId(null);
    }
  };

  const handleToggleSavedEvent = async (event) => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const normalizedEventId = String(event.id);
    const isSaved = savedEventIds.has(normalizedEventId);

    setPendingSavedEventId(event.id);
    setSavedEventsErrorMessage("");

    try {
      if (isSaved) {
        await apiFetch(`/events/${event.id}/save`, { method: "DELETE" });
        setSavedEventIds((prev) => {
          const next = new Set(prev);
          next.delete(normalizedEventId);
          return next;
        });
        emitSavedItemChanged({
          itemType: "event",
          type: "removed",
          itemId: event.id,
        });
        setFeedbackToast({ kind: "save-undo", eventId: event.id });
        return;
      }

      const savedEvent = await apiFetch(`/events/${event.id}/save`, { method: "POST" });
      setSavedEventIds((prev) => new Set(prev).add(normalizedEventId));
      emitSavedItemChanged({
        itemType: "event",
        type: "saved",
        itemId: event.id,
        item: savedEvent,
      });
      setFeedbackToast({ kind: "save", eventId: event.id });
    } catch (error) {
      setSavedEventsErrorMessage(error.message || "Could not update saved events.");
    } finally {
      setPendingSavedEventId(null);
    }
  };

  const handleSkip = (event) => {
    const wasSkipped = skippedIds.has(event.id);

    setSkippedIds((prev) => {
      const next = new Set(prev);
      if (wasSkipped) {
        next.delete(event.id);
      } else {
        next.add(event.id);
      }
      return next;
    });

    if (wasSkipped) {
      setFeedbackToast({ kind: "skip-undo", eventId: event.id });
      return;
    }

    setFeedbackToast({ kind: "skip", eventId: event.id });
    setTimeout(() => {
      scrollToCard(activeIndex);
    }, 250);
  };

  const hasActiveFilters =
    Boolean(selectedCategoryId) || datePreset !== "all" || showPastEvents || Boolean(searchQuery.trim());

  const handleClearFilters = () => {
    setSelectedCategoryId("");
    setDatePreset("all");
    setShowPastEvents(false);
    setSearchQuery("");
  };

  return (
    <div style={styles.fullBleed}>
      <div style={styles.topBar}>
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>Discover Events</h1>
          <p style={styles.subtitle}>
            Swipe up to explore · {registeredEventIds.size} attending
          </p>
        </div>

        {filteredEvents.length > 0 && !isLoading ? (
          <div style={styles.counter} aria-live="polite">
            <span style={styles.counterCurrent}>{activeIndex + 1}</span>
            <span style={styles.counterDivider}>/</span>
            <span>{filteredEvents.length}</span>
          </div>
        ) : null}
      </div>

      <div style={styles.searchRow}>
        <input
          type="search"
          placeholder="Search events by name, description, or category…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
          aria-label="Search events"
        />
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

      <div style={styles.filterGroup} aria-label="Date range filters">
        <div style={styles.filterGroupHeader}>
          <span style={styles.filterGroupLabel}>When</span>
          {hasActiveFilters ? (
            <button type="button" onClick={handleClearFilters} style={styles.clearLink}>
              Clear filters
            </button>
          ) : null}
        </div>
        <div style={styles.chipScroller} role="tablist">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id)}
              style={{
                ...styles.chip,
                ...(datePreset === preset.id ? styles.chipActive : null),
              }}
              role="tab"
              aria-selected={datePreset === preset.id}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label style={styles.showPastRow}>
          <input
            type="checkbox"
            checked={showPastEvents}
            onChange={(e) => setShowPastEvents(e.target.checked)}
          />
          <span>Show past events (labeled "Past")</span>
        </label>

        {datePreset === "custom" ? (
          <div style={styles.customRangeRow}>
            <label style={styles.dateField}>
              <span style={styles.dateFieldLabel}>From</span>
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(event) => setCustomFrom(event.target.value)}
                style={styles.dateInput}
              />
            </label>
            <label style={styles.dateField}>
              <span style={styles.dateFieldLabel}>To</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(event) => setCustomTo(event.target.value)}
                style={styles.dateInput}
              />
            </label>
          </div>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <div style={styles.filterGroup} aria-label="Category filters">
          <div style={styles.filterGroupHeader}>
            <span style={styles.filterGroupLabel}>Category</span>
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

      {registrationErrorMessage ? (
        <div style={styles.alertWrap}>
          <Alert variant="error">{registrationErrorMessage}</Alert>
        </div>
      ) : null}

      {savedEventsErrorMessage ? (
        <div style={styles.alertWrap}>
          <Alert variant="error">{savedEventsErrorMessage}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <div style={styles.stateWrap}>
          <LoadingState
            align="center"
            title="Loading events"
            description="Fetching upcoming events from the directory."
          />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={styles.stateWrap}>
          <EmptyState
            align="center"
            title={
              events.length === 0
                ? "No upcoming events yet"
                : allLoadedArePast && !showPastEvents
                  ? "No upcoming events"
                  : searchQuery.trim()
                    ? "No events match your search"
                    : "No events match your filters"
            }
            description={
              events.length === 0
                ? "Once events are scheduled, they will appear here."
                : allLoadedArePast && !showPastEvents
                  ? 'Turn on "Show past events" under When to browse past activities.'
                  : searchQuery.trim()
                    ? "Try different keywords or clear the search."
                    : "Try adjusting the date range or category to see more results."
            }
          />
        </div>
      ) : (
        <div style={styles.resultsColumn}>
          <EventLocationsMap events={filteredEvents} />

          <div ref={scrollerRef} style={styles.scroller}>
            {filteredEvents.map((event, index) => {
              const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
              const isRegistered = registeredEventIds.has(String(event.id));
              const isWaitlisted = waitlistedEventIds.has(String(event.id));
              const isSaved = savedEventIds.has(String(event.id));
              const isSkipped = skippedIds.has(event.id);
              const isActive = index === activeIndex;
              const isToastForThis = feedbackToast?.eventId === event.id;
              const dateShort = formatEventDateShort(event.start_time);
              const dateLong = formatEventDateLong(event.start_time);
              const timeRange = formatTimeRange(event.start_time, event.end_time);
              const past = isEventPast(event);

              return (
                <section
                  key={event.id}
                  ref={(el) => (cardRefs.current[index] = el)}
                  style={styles.cardSlot}
                  aria-label={`${event.title}, card ${index + 1} of ${filteredEvents.length}`}
                >
                  <article
                    style={{
                      ...styles.card,
                      background: gradient,
                      transform: isActive ? "scale(1)" : "scale(0.96)",
                      opacity: isActive ? 1 : 0.85,
                      filter: isSkipped ? "grayscale(0.6)" : "none",
                    }}
                  >
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt=""
                        style={styles.cardImage}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <div style={styles.cardOverlay} aria-hidden="true" />
                    <div style={styles.cardContent}>
                      <div style={styles.cardTopRow}>
                        <div style={styles.dateBadge} aria-label={`Event date ${dateLong}`}>
                          <span style={styles.dateBadgeMain}>{dateShort}</span>
                          {timeRange ? (
                            <span style={styles.dateBadgeSub}>{timeRange}</span>
                          ) : null}
                        </div>
                        <div style={styles.topBadgeStack}>
                          {past ? (
                            <span style={styles.pastBadge} aria-label="Past event">
                              Past
                            </span>
                          ) : null}
                          {event.score > 0 ? (
                            <span
                              style={styles.scoreBadge}
                              title="Match score based on your interests"
                            >
                              ★ Match {event.score}
                            </span>
                          ) : null}
                          {event.is_online ? (
                            <span style={styles.onlineBadge}>● Online</span>
                          ) : null}
                          {isRegistered ? (
                            <span style={styles.likedBadge}>♥ Going</span>
                          ) : null}
                          {isWaitlisted ? (
                            <span style={styles.waitlistBadge}>Waitlisted</span>
                          ) : null}
                          {!isRegistered && !isWaitlisted && event.capacity_status === "full" ? (
                            <span style={styles.fullBadge}>Full</span>
                          ) : null}
                          {isSaved ? (
                            <span style={styles.savedBadge}>Saved</span>
                          ) : null}
                        </div>
                      </div>

                      <div style={styles.cardMain}>
                        {event.category_name ? (
                          <span style={styles.categoryBadge}>{event.category_name}</span>
                        ) : null}
                        <h2 style={styles.cardTitle}>{event.title}</h2>
                        {event.club_name ? (
                          <p style={styles.cardClub}>by {event.club_name}</p>
                        ) : null}
                        <p style={styles.cardDescription}>
                          {event.description || "No description provided yet."}
                        </p>
                        {event.recommendation_explanation ? (
                          <p style={styles.recommendationExplanation}>
                            Why: {event.recommendation_explanation}
                          </p>
                        ) : null}

                        <div style={styles.metaRow}>
                          {event.city ? (
                            <span style={styles.metaPill}>📍 {event.city}</span>
                          ) : null}
                          {event.location ? (
                            <span style={styles.metaPill}>🏛 {event.location}</span>
                          ) : null}
                          <span style={styles.metaPill}>
                            {event.attendee_count === 1
                              ? "1 attendee"
                              : `${event.attendee_count || 0} attendees`}
                            {event.max_capacity ? ` / ${event.max_capacity} capacity` : ""}
                          </span>
                          {event.waitlist_count > 0 ? (
                            <span style={styles.metaPill}>
                              {event.waitlist_count === 1
                                ? "1 on waitlist"
                                : `${event.waitlist_count} on waitlist`}
                            </span>
                          ) : null}
                          {event.max_capacity && event.capacity_status !== "full" ? (
                            <span style={styles.metaPill}>
                              {event.remaining_capacity === 1
                                ? "1 spot left"
                                : `${event.remaining_capacity || 0} spots left`}
                            </span>
                          ) : null}
                        </div>

                        <div style={styles.linkRow}>
                          <button
                            type="button"
                            onClick={() => handleToggleRegistration(event)}
                            disabled={
                              pendingRegistrationEventId === event.id ||
                              isLoadingRegistrations ||
                              (past && !isRegistered && !isWaitlisted)
                            }
                            style={{
                              ...styles.membershipButton,
                              ...(isRegistered || isWaitlisted
                                ? styles.membershipButtonJoined
                                : styles.membershipButtonPrimary),
                            }}
                          >
                            {pendingRegistrationEventId === event.id
                              ? "Saving..."
                              : isLoadingRegistrations
                                ? "Checking..."
                                : isRegistered
                                  ? "Leave event"
                                  : isWaitlisted
                                    ? "Leave waitlist"
                                    : event.capacity_status === "full"
                                      ? "Join waitlist"
                                      : "Attend event"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSavedEvent(event)}
                            disabled={
                              pendingSavedEventId === event.id ||
                              isLoadingSavedEvents
                            }
                            style={{
                              ...styles.membershipButton,
                              ...(isSaved
                                ? styles.membershipButtonJoined
                                : styles.membershipButtonSecondary),
                            }}
                          >
                            {pendingSavedEventId === event.id
                              ? "Saving..."
                              : isLoadingSavedEvents
                                ? "Checking..."
                                : isSaved
                                  ? "Saved"
                                  : "Save"}
                          </button>
                          <Link to={`/events/${event.id}`} style={styles.detailsButton}>
                            View details →
                          </Link>
                          {event.registration_url ? (
                            <a
                              href={event.registration_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.registerButton}
                            >
                              Register ↗
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div style={styles.cardBottomRow}>
                        <p style={styles.scrollHint}>
                          {index < filteredEvents.length - 1
                            ? "Scroll down for more ↓"
                            : "You've reached the end ✨"}
                        </p>
                      </div>
                    </div>

                    <div style={styles.actionRail} aria-label="Card actions">
                      <button
                        type="button"
                        onClick={() => handleSkip(event)}
                        style={{
                          ...styles.actionButton,
                          ...(isSkipped ? styles.actionButtonSkippedActive : null),
                        }}
                        aria-label={isSkipped ? "Undo skip" : "Skip this event"}
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
                        onClick={() => handleToggleSavedEvent(event)}
                        disabled={pendingSavedEventId === event.id || isLoadingSavedEvents}
                        style={{
                          ...styles.actionButton,
                          ...(isSaved ? styles.actionButtonLikedActive : null),
                        }}
                        aria-label={isSaved ? "Remove saved event" : "Save this event"}
                        aria-pressed={isSaved}
                        title={isSaved ? "Remove saved" : "Save"}
                      >
                        <span style={styles.actionGlyph}>★</span>
                        <span style={styles.actionLabel}>
                          {isSaved ? "Saved" : "Save"}
                        </span>
                      </button>

                      {event.registration_url ? (
                        <a
                          href={event.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.actionButton}
                          aria-label="Open registration page"
                          title="Register"
                        >
                          <span style={styles.actionGlyph}>↗</span>
                          <span style={styles.actionLabel}>Reg</span>
                        </a>
                      ) : null}
                    </div>

                    {isToastForThis ? (
                      <div
                        style={{
                          ...styles.toast,
                          ...(feedbackToast.kind === "interested" ||
                          feedbackToast.kind === "interested-undo" ||
                          feedbackToast.kind === "waitlisted" ||
                          feedbackToast.kind === "waitlist-undo" ||
                          feedbackToast.kind === "save" ||
                          feedbackToast.kind === "save-undo"
                            ? styles.toastLike
                            : styles.toastSkip),
                        }}
                        aria-hidden="true"
                      >
                        {feedbackToast.kind === "interested"
                          ? "♥ Going"
                          : feedbackToast.kind === "interested-undo"
                            ? "Undo Going"
                            : feedbackToast.kind === "waitlisted"
                              ? "Waitlisted"
                              : feedbackToast.kind === "waitlist-undo"
                                ? "Left waitlist"
                                : feedbackToast.kind === "save"
                                  ? "★ Saved"
                                  : feedbackToast.kind === "save-undo"
                                    ? "Removed"
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
        </div>
      )}

    </div>
  );
}

const SCROLLER_HEIGHT = "calc(100dvh - 280px)";
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
  searchRow: {
    padding: "0 4px",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "999px",
    border: "1px solid rgba(17, 24, 39, 0.15)",
    background: "white",
    fontSize: "14px",
    color: "#111827",
    boxSizing: "border-box",
    outline: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
  customRangeRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    paddingTop: "4px",
  },
  showPastRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingTop: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
    userSelect: "none",
  },
  dateField: {
    flex: "1 1 160px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  dateFieldLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  dateInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    color: "#111827",
    background: "white",
    boxSizing: "border-box",
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
  resultsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
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
  cardImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
    pointerEvents: "none",
  },
  cardOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.7) 100%)",
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
  dateBadge: {
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
  dateBadgeMain: {
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  dateBadgeSub: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#4b5563",
    fontVariantNumeric: "tabular-nums",
  },
  topBadgeStack: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    alignItems: "flex-end",
  },
  onlineBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(16, 185, 129, 0.95)",
    color: "white",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
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
  waitlistBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.95)",
    color: "white",
    fontSize: "11px",
    fontWeight: 800,
  },
  fullBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(17, 24, 39, 0.82)",
    color: "white",
    fontSize: "11px",
    fontWeight: 800,
  },
  savedBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(250, 204, 21, 0.95)",
    color: "#111827",
    fontSize: "11px",
    fontWeight: 800,
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
    fontSize: "clamp(26px, 5.5vw, 36px)",
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    textShadow: "0 2px 12px rgba(0, 0, 0, 0.25)",
  },
  cardClub: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "rgba(255, 255, 255, 0.9)",
    textShadow: "0 1px 4px rgba(0, 0, 0, 0.25)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  cardDescription: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.55,
    color: "rgba(255, 255, 255, 0.95)",
    textShadow: "0 1px 6px rgba(0, 0, 0, 0.25)",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  recommendationExplanation: {
    margin: 0,
    padding: "8px 10px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.16)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: "12px",
    lineHeight: 1.45,
    textShadow: "0 1px 4px rgba(0, 0, 0, 0.22)",
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
  membershipButtonSecondary: {
    background: "rgba(255, 255, 255, 0.18)",
    color: "white",
    borderColor: "rgba(255, 255, 255, 0.38)",
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
  registerButton: {
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
  pastBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "rgba(17, 24, 39, 0.75)",
    color: "white",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
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
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
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
