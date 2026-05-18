import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";
import RegisteredEventsCalendar from "../components/RegisteredEventsCalendar.jsx";
import {
  emitClubMembershipChanged,
  fetchJoinedClubs,
  subscribeToClubMembershipChanges,
} from "../lib/clubMemberships.js";
import { isEventPast } from "../lib/eventTime.js";
import { subscribeToSavedItemChanges } from "../lib/savedItems.js";
import { syncPendingOnboardingToUser } from "../onboarding/syncOnboardingToUser.js";
import { Alert, Button, EmptyState, LoadingState, Skeleton } from "../components/ui/index.js";
import { INTERESTS_EMPTY_FOR_RECOMMENDATIONS } from "../lib/emptyStateMessages.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const { userId, logout } = useAuth();
  const [usersCount, setUsersCount] = useState(null);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [formValues, setFormValues] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [profileErrorMessage, setProfileErrorMessage] = useState("");
  const [userInterests, setUserInterests] = useState([]);
  const [isLoadingInterests, setIsLoadingInterests] = useState(true);
  const [recommendedClubs, setRecommendedClubs] = useState([]);
  const [isLoadingRecommendedClubs, setIsLoadingRecommendedClubs] = useState(true);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [isLoadingRecommendedEvents, setIsLoadingRecommendedEvents] = useState(true);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [isLoadingRegisteredEvents, setIsLoadingRegisteredEvents] = useState(true);
  const [registeredEventsErrorMessage, setRegisteredEventsErrorMessage] = useState("");
  const [joinedClubs, setJoinedClubs] = useState([]);
  const [joinedClubsErrorMessage, setJoinedClubsErrorMessage] = useState("");
  const [pendingLeaveClubId, setPendingLeaveClubId] = useState(null);
  const [savedClubs, setSavedClubs] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  const [isLoadingSavedItems, setIsLoadingSavedItems] = useState(true);
  const [savedItemsErrorMessage, setSavedItemsErrorMessage] = useState("");
  const [pendingUnsaveClubId, setPendingUnsaveClubId] = useState(null);
  const [pendingUnsaveEventId, setPendingUnsaveEventId] = useState(null);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [isLoadingSimilarUsers, setIsLoadingSimilarUsers] = useState(true);
  const [similarUsersErrorMessage, setSimilarUsersErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        if (userId) {
          try {
            await syncPendingOnboardingToUser(userId, apiFetch);
          } catch {
            /* pending quiz/selections can sync on next visit */
          }

          const me = await apiFetch("/me");
          if (!ignore) {
            setProfile(me);
            setFormValues({
              email: me.email || "",
              first_name: me.first_name || "",
              last_name: me.last_name || "",
              programme: me.programme || "",
              year: me.year ?? "",
              faculty: me.faculty || "",
              school: me.school || "",
              grade_year: me.grade_year ?? "",
              age_group: me.age_group || "",
              city: me.city || "",
              show_in_attendee_suggestions:
                me.show_in_attendee_suggestions !== false,
            });
          }

          let interestsPayload = [];
          try {
            const raw = await apiFetch(`/users/${userId}/interests`);
            interestsPayload = Array.isArray(raw) ? raw : [];
          } catch {
            interestsPayload = [];
          }

          let recommendedClubsPayload = [];
          try {
            const raw = await apiFetch("/clubs/recommended");
            recommendedClubsPayload = Array.isArray(raw) ? raw : [];
          } catch {
            recommendedClubsPayload = [];
          }

          let recommendedEventsPayload = [];
          try {
            const raw = await apiFetch("/events/recommended");
            recommendedEventsPayload = Array.isArray(raw) ? raw : [];
          } catch {
            recommendedEventsPayload = [];
          }

          let similarUsersPayload = [];
          let similarUsersErr = "";
          try {
            const raw = await apiFetch("/users/similar?limit=6");
            similarUsersPayload = Array.isArray(raw) ? raw : [];
          } catch (error) {
            similarUsersPayload = [];
            similarUsersErr =
              error.message || "Could not load similar people.";
          }

          let registeredEventsPayload = [];
          let registeredEventsError = "";
          try {
            const raw = await apiFetch(`/users/${userId}/registered-events`);
            registeredEventsPayload = Array.isArray(raw) ? raw : [];
          } catch (error) {
            registeredEventsPayload = [];
            registeredEventsError =
              error.message || "Could not load your registered events.";
          }

          let joinedClubsPayload = [];
          let joinedClubsErr = "";
          try {
            joinedClubsPayload = await fetchJoinedClubs(userId);
          } catch (error) {
            joinedClubsPayload = [];
            joinedClubsErr =
              error.message || "Could not load your clubs.";
          }

          let savedClubsPayload = [];
          let savedEventsPayload = [];
          let savedItemsErr = "";
          try {
            const [rawClubs, rawEvents] = await Promise.all([
              apiFetch(`/users/${userId}/saved-clubs`),
              apiFetch(`/users/${userId}/saved-events`),
            ]);
            savedClubsPayload = Array.isArray(rawClubs) ? rawClubs : [];
            savedEventsPayload = Array.isArray(rawEvents) ? rawEvents : [];
          } catch (error) {
            savedItemsErr = error.message || "Could not load your saved items.";
          }

          if (!ignore) {
            setUserInterests(interestsPayload);
            setRecommendedClubs(recommendedClubsPayload);
            setRecommendedEvents(recommendedEventsPayload);
            setSimilarUsers(similarUsersPayload);
            setSimilarUsersErrorMessage(similarUsersErr);
            setRegisteredEvents(registeredEventsPayload);
            setRegisteredEventsErrorMessage(registeredEventsError);
            setJoinedClubs(joinedClubsPayload);
            setJoinedClubsErrorMessage(joinedClubsErr);
            setSavedClubs(savedClubsPayload);
            setSavedEvents(savedEventsPayload);
            setSavedItemsErrorMessage(savedItemsErr);
          }
        } else {
          if (!ignore) {
            setUserInterests([]);
            setRecommendedClubs([]);
            setRecommendedEvents([]);
            setSimilarUsers([]);
            setSimilarUsersErrorMessage("");
            setRegisteredEvents([]);
            setRegisteredEventsErrorMessage("");
            setJoinedClubs([]);
            setJoinedClubsErrorMessage("");
            setSavedClubs([]);
            setSavedEvents([]);
            setSavedItemsErrorMessage("");
          }
        }

        const users = await apiFetch("/users");
        const cats = await apiFetch("/interest-categories");
        if (!ignore) {
          setUsersCount(Array.isArray(users) ? users.length : 0);
          setCategories(Array.isArray(cats) ? cats : []);
        }
      } catch (error) {
        if (!ignore) setErrorMessage(error.message);
      } finally {
        if (!ignore) {
          setIsLoadingProfile(false);
          setIsLoadingInterests(false);
          setIsLoadingRecommendedClubs(false);
          setIsLoadingRecommendedEvents(false);
          setIsLoadingSimilarUsers(false);
          setIsLoadingRegisteredEvents(false);
          setIsLoadingSavedItems(false);
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
        setJoinedClubs((prev) => {
          if (type === "left") {
            return prev.filter((item) => String(item.id) !== normalizedClubId);
          }

          if (type === "joined" && club) {
            const withoutCurrent = prev.filter(
              (item) => String(item.id) !== normalizedClubId
            );
            return [...withoutCurrent, club].sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, {
                sensitivity: "base",
              })
            );
          }

          return prev;
        });
        setJoinedClubsErrorMessage("");
      }),
    []
  );

  useEffect(
    () =>
      subscribeToSavedItemChanges(({ itemType, type, itemId, item }) => {
        const normalizedItemId = String(itemId);

        if (itemType === "club") {
          setSavedClubs((prev) => {
            if (type === "removed") {
              return prev.filter((club) => String(club.id) !== normalizedItemId);
            }
            if (type === "saved" && item) {
              const withoutCurrent = prev.filter(
                (club) => String(club.id) !== normalizedItemId
              );
              return [...withoutCurrent, item].sort((a, b) =>
                (a.name || "").localeCompare(b.name || "", undefined, {
                  sensitivity: "base",
                })
              );
            }
            return prev;
          });
        }

        if (itemType === "event") {
          setSavedEvents((prev) => {
            if (type === "removed") {
              return prev.filter((event) => String(event.id) !== normalizedItemId);
            }
            if (type === "saved" && item) {
              const withoutCurrent = prev.filter(
                (event) => String(event.id) !== normalizedItemId
              );
              return [...withoutCurrent, item].sort((a, b) => {
                const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
                const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
                return aTime - bTime;
              });
            }
            return prev;
          });
        }

        setSavedItemsErrorMessage("");
      }),
    []
  );

  const groupedUserInterests = useMemo(() => {
    const groups = new Map();
    userInterests.forEach((interest) => {
      const categoryName = interest.category_name || "Interests";
      const existing = groups.get(categoryName) || [];
      existing.push(interest);
      groups.set(categoryName, existing);
    });
    return Array.from(groups.entries());
  }, [userInterests]);

  const upcomingRecommendedEvents = useMemo(
    () => recommendedEvents.filter((event) => !isEventPast(event)),
    [recommendedEvents]
  );

  const registeredEventsSorted = useMemo(() => {
    return [...(registeredEvents || [])].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }, [registeredEvents]);

  const joinedClubsWithRecurringTimes = useMemo(
    () =>
      joinedClubs.filter(
        (club) =>
          typeof club.meeting_weekday === "number" && club.meeting_start_time
      ),
    [joinedClubs]
  );

  const hasSavedInterests = Boolean(userId && userInterests.length > 0);

  const interestsEmptyAction = (
    <Button asChild variant="primary">
      <Link to="/interests">Choose interests</Link>
    </Button>
  );

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Not provided";

  const fieldOrFallback = (value) =>
    value !== null && value !== undefined && String(value).trim() !== ""
      ? value
      : "Not provided";

  const formatEventDate = (value) => {
    if (!value) return "Date to be announced";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "Date to be announced";
    }

    return parsed.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatJoinedDate = (value) => {
    if (!value) return "Joined recently";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "Joined recently";
    }

    return `Joined ${parsed.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
  };

  const handleLeaveClub = async (clubId) => {
    setPendingLeaveClubId(clubId);
    setJoinedClubsErrorMessage("");

    try {
      await apiFetch(`/clubs/${clubId}/join`, { method: "DELETE" });
      setJoinedClubs((prev) => prev.filter((club) => club.id !== clubId));
      emitClubMembershipChanged({ type: "left", clubId });
    } catch (error) {
      setJoinedClubsErrorMessage(error.message || "Could not update your clubs.");
    } finally {
      setPendingLeaveClubId(null);
    }
  };

  const handleUnsaveClub = async (clubId) => {
    setPendingUnsaveClubId(clubId);
    try {
      await apiFetch(`/clubs/${clubId}/save`, { method: "DELETE" });
      setSavedClubs((prev) => prev.filter((c) => c.id !== clubId));
    } catch (error) {
      setSavedItemsErrorMessage(error.message || "Could not remove saved club.");
    } finally {
      setPendingUnsaveClubId(null);
    }
  };

  const handleUnsaveEvent = async (eventId) => {
    setPendingUnsaveEventId(eventId);
    try {
      await apiFetch(`/events/${eventId}/save`, { method: "DELETE" });
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (error) {
      setSavedItemsErrorMessage(error.message || "Could not remove saved event.");
    } finally {
      setPendingUnsaveEventId(null);
    }
  };

  const handleProfileInputChange = (event) => {
    const { checked, name, type, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleStartEditing = () => {
    setProfileSuccessMessage("");
    setProfileErrorMessage("");
    setIsEditingProfile(true);
  };

  const handleCancelEditing = () => {
    if (profile) {
      setFormValues({
        email: profile.email || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        programme: profile.programme || "",
        year: profile.year ?? "",
        faculty: profile.faculty || "",
        school: profile.school || "",
        grade_year: profile.grade_year ?? "",
        age_group: profile.age_group || "",
        city: profile.city || "",
        show_in_attendee_suggestions:
          profile.show_in_attendee_suggestions !== false,
      });
    }
    setProfileSuccessMessage("");
    setProfileErrorMessage("");
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!userId || !formValues) return;

    setIsSavingProfile(true);
    setProfileSuccessMessage("");
    setProfileErrorMessage("");

    const payload = {
      first_name: formValues.first_name || null,
      last_name: formValues.last_name || null,
      programme: formValues.programme || null,
      year:
        formValues.year === "" || formValues.year === null
          ? null
          : Number.isNaN(Number(formValues.year))
          ? null
          : Number(formValues.year),
      faculty: formValues.faculty || null,
      school: formValues.school || null,
      grade_year:
        formValues.grade_year === "" || formValues.grade_year === null
          ? null
          : Number.isNaN(Number(formValues.grade_year))
          ? null
          : Number(formValues.grade_year),
      age_group: formValues.age_group || null,
      city: formValues.city || null,
    };

    try {
      const updated = await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const updatedSettings = await apiFetch("/me/attendee-suggestion-settings", {
        method: "PATCH",
        body: JSON.stringify({
          show_in_attendee_suggestions:
            formValues.show_in_attendee_suggestions !== false,
        }),
      });
      setProfile({
        ...updated,
        show_in_attendee_suggestions:
          updatedSettings.show_in_attendee_suggestions !== false,
      });
      setProfileSuccessMessage("Profile updated successfully.");
      setIsEditingProfile(false);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setProfileErrorMessage("Please log in again.");
        logout();
        navigate("/login");
        return;
      }

      setProfileErrorMessage(error.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div style={container}>
      <div style={headerRow}>
        <div>
          <h1 style={title}>Dashboard</h1>
        </div>
      </div>

      <div style={grid}>
        <section style={card}>
          <div style={profileHeader}>
            <div>
              <h2 style={sectionTitle}>Your calendar &amp; events</h2>
              <p style={profileSubtext}>
                Month view shows when you&apos;re booked. Registered event links below are shortcuts to detail pages.
              </p>
            </div>
          </div>

          {isLoadingRegisteredEvents ? (
            <LoadingState
              align="left"
              title="Loading your events"
              description="Fetching the events you've registered for."
            />
          ) : !userId ? (
            <EmptyState
              align="left"
              title="Log in to see your calendar"
              description="Your registered events and calendar appear only for your account."
            />
          ) : (
            <>
              {registeredEventsErrorMessage ? (
                <Alert variant="error" style={{ marginBottom: 14 }}>
                  {registeredEventsErrorMessage}
                </Alert>
              ) : null}

              <RegisteredEventsCalendar
                events={registeredEvents}
                clubAttendances={joinedClubsWithRecurringTimes}
              />

              {!registeredEventsErrorMessage ? (
                <div style={attendingLinksBlock}>
                  <h3 style={attendingLinksHeading}>Events you&apos;re attending</h3>
                  {registeredEvents.length === 0 ? (
                    <EmptyState
                      align="left"
                      title="No events registered yet"
                      description={`Open an event and choose "I'm attending" to populate this list.`}
                      action={
                        <Button asChild variant="primary">
                          <Link to="/events">Browse events</Link>
                        </Button>
                      }
                    />
                  ) : (
                    <ul style={attendingLinksList}>
                      {registeredEventsSorted.map((evt) => (
                        <li key={evt.id} style={attendingLinksItem}>
                          <Link to={`/events/${evt.id}`} style={attendingLinksOnly}>
                            {evt.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              <div style={joinedClubsBlock}>
                <h3 style={joinedClubsHeading}>Clubs you&apos;ve joined</h3>
                {joinedClubsErrorMessage ? (
                  <Alert variant="error">{joinedClubsErrorMessage}</Alert>
                ) : joinedClubs.length === 0 ? (
                  <EmptyState
                    align="left"
                    title="No clubs joined yet"
                    description='Open a club and use “Join club” on its page to appear here.'
                    action={
                      <Button asChild variant="secondary">
                        <Link to="/clubs">Browse clubs</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div style={joinedClubsGrid}>
                    {joinedClubs.map((club) => (
                      <article key={club.id} style={joinedClubCard}>
                        <div style={joinedClubCardHeader}>
                          <div>
                            <Link to={`/clubs/${club.id}`} style={joinedClubCardTitle}>
                              {club.name}
                            </Link>
                            <p style={joinedClubCategoryLine}>
                              {club.category_name || "Uncategorized"}
                            </p>
                            <p style={joinedClubDateLine}>
                              {formatJoinedDate(club.joined_at)}
                            </p>
                            <p style={joinedClubDateLine}>
                              {club.member_count === 1
                                ? "1 member"
                                : `${club.member_count || 0} members`}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            disabled={pendingLeaveClubId === club.id}
                            onClick={() => handleLeaveClub(club.id)}
                            className="min-w-[120px]"
                          >
                            {pendingLeaveClubId === club.id ? "Leaving..." : "Leave club"}
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section style={card}>
          <div style={profileHeader}>
            <div>
              <h2 style={sectionTitle}>Saved items</h2>
              <p style={profileSubtext}>
                Clubs and events you bookmarked for later.
              </p>
            </div>
          </div>

          {isLoadingSavedItems ? (
            <LoadingState
              align="left"
              title="Loading saved items"
              description="Fetching your bookmarked clubs and events."
            />
          ) : !userId ? (
            <EmptyState
              align="left"
              title="Log in to see saved items"
              description="Your saved clubs and events will appear here after sign in."
            />
          ) : savedItemsErrorMessage ? (
            <Alert variant="error">{savedItemsErrorMessage}</Alert>
          ) : savedClubs.length === 0 && savedEvents.length === 0 ? (
            <EmptyState
              align="left"
              title="No saved items yet"
              description="Open any club or event and use the Save button to bookmark it here."
              action={
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Button asChild variant="primary">
                    <Link to="/clubs">Browse clubs</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to="/events">Browse events</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              {savedClubs.length > 0 ? (
                <div style={{ marginBottom: savedEvents.length > 0 ? "20px" : 0 }}>
                  <h3 style={savedItemsSubheading}>Saved clubs</h3>
                  <div style={savedItemsGrid}>
                    {savedClubs.map((club) => (
                      <article key={club.id} style={savedItemCard}>
                        <div style={savedItemCardBody}>
                          <Link to={`/clubs/${club.id}`} style={savedItemTitle}>
                            {club.name}
                          </Link>
                          <p style={savedItemMeta}>
                            {club.category_name || "Uncategorized"}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          disabled={pendingUnsaveClubId === club.id}
                          onClick={() => handleUnsaveClub(club.id)}
                        >
                          {pendingUnsaveClubId === club.id ? "Removing..." : "Remove"}
                        </Button>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {savedEvents.length > 0 ? (
                <div>
                  <h3 style={savedItemsSubheading}>Saved events</h3>
                  <div style={savedItemsGrid}>
                    {savedEvents.map((event) => (
                      <article key={event.id} style={savedItemCard}>
                        <div style={savedItemCardBody}>
                          <Link to={`/events/${event.id}`} style={savedItemTitle}>
                            {event.title}
                          </Link>
                          <p style={savedItemMeta}>
                            {formatEventDate(event.start_time)}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          disabled={pendingUnsaveEventId === event.id}
                          onClick={() => handleUnsaveEvent(event.id)}
                        >
                          {pendingUnsaveEventId === event.id ? "Removing..." : "Remove"}
                        </Button>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section style={card}>
          <div style={profileHeader}>
            <div>
              <h2 style={sectionTitle}>People with similar interests</h2>
              <p style={profileSubtext}>
                Meet students who share your saved interests. Only limited profile details are shown.
              </p>
            </div>
          </div>

          {isLoadingSimilarUsers ? (
            <LoadingState
              align="left"
              title="Loading people suggestions"
              description="Finding students with overlapping interests."
            />
          ) : !userId ? (
            <EmptyState
              align="left"
              title="Log in to see people suggestions"
              description="Your similar-interest suggestions will appear here after sign in."
            />
          ) : similarUsersErrorMessage ? (
            <Alert variant="error">{similarUsersErrorMessage}</Alert>
          ) : !hasSavedInterests ? (
            <EmptyState
              align="left"
              title="No people suggestions yet"
              description={INTERESTS_EMPTY_FOR_RECOMMENDATIONS}
              action={interestsEmptyAction}
            />
          ) : similarUsers.length > 0 ? (
            <div style={similarPeopleGrid}>
              {similarUsers.map((person, index) => {
                const sharedInterests = Array.isArray(person.shared_interests)
                  ? person.shared_interests
                  : [];
                const studyContext = [person.programme, person.faculty]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <article
                    key={`${person.name || "similar-person"}-${index}`}
                    style={similarPersonCard}
                  >
                    <div style={similarPersonAvatar} aria-hidden="true">
                      {(person.name || "Student").trim().charAt(0).toUpperCase()}
                    </div>
                    <div style={similarPersonContent}>
                      <h3 style={similarPersonName}>
                        {person.name || "Campus member"}
                      </h3>
                      <p style={similarPersonMeta}>
                        {studyContext || "Study details not provided"}
                      </p>
                      <p style={similarPersonMatch}>
                        {person.shared_interest_count === 1
                          ? "1 shared interest"
                          : `${person.shared_interest_count || sharedInterests.length} shared interests`}
                      </p>
                      {sharedInterests.length > 0 ? (
                        <div style={chipWrap}>
                          {sharedInterests.slice(0, 4).map((interest) => (
                            <span
                              key={`${person.name || index}-${interest}`}
                              style={sharedInterestChip}
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              align="left"
              title="No similar people found yet"
              description="As more students save interests, you will see people with overlapping topics here."
            />
          )}
        </section>

        <section style={card}>
          <div style={profileHeader}>
            <div>
              <h2 style={sectionTitle}>Your profile</h2>
              <p style={profileSubtext}>Keep your details up to date for better recommendations.</p>
            </div>
          </div>

          {isLoadingProfile ? (
            <div style={skeletonStack} aria-hidden="true">
              <Skeleton style={skeletonLine} />
              <Skeleton style={skeletonLine} />
              <Skeleton style={skeletonLine} />
              <Skeleton style={skeletonLine} />
            </div>
          ) : !userId ? (
            <EmptyState
              align="left"
              title="No active session found"
              description="Log in to view and edit your profile details."
            />
          ) : profile && isEditingProfile && formValues ? (
            <form onSubmit={handleSaveProfile}>
              <dl style={detailsList}>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>First name</dt>
                  <dd style={detailsValue}>
                    <input
                      type="text"
                      name="first_name"
                      value={formValues.first_name}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Last name</dt>
                  <dd style={detailsValue}>
                    <input
                      type="text"
                      name="last_name"
                      value={formValues.last_name}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Email</dt>
                  <dd style={detailsValue}>
                    <span style={readonlyValue}>{profile.email}</span>
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Programme</dt>
                  <dd style={detailsValue}>
                    <input
                      type="text"
                      name="programme"
                      value={formValues.programme}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Year</dt>
                  <dd style={detailsValue}>
                    <input
                      type="number"
                      name="year"
                      value={formValues.year}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Faculty</dt>
                  <dd style={detailsValue}>
                    <input
                      type="text"
                      name="faculty"
                      value={formValues.faculty}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>School</dt>
                  <dd style={detailsValue}>
                    <input
                      type="text"
                      name="school"
                      value={formValues.school}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>City</dt>
                  <dd style={detailsValue}>
                    <input
                      type="text"
                      name="city"
                      value={formValues.city}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Age group</dt>
                  <dd style={detailsValue}>
                    <input
                      type="text"
                      name="age_group"
                      value={formValues.age_group}
                      onChange={handleProfileInputChange}
                      style={input}
                      disabled={isSavingProfile}
                    />
                  </dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Event attendee suggestions</dt>
                  <dd style={detailsValue}>
                    <label style={checkboxLabel}>
                      <input
                        type="checkbox"
                        name="show_in_attendee_suggestions"
                        checked={formValues.show_in_attendee_suggestions !== false}
                        onChange={handleProfileInputChange}
                        disabled={isSavingProfile}
                      />
                      <span>
                        Show my limited profile to people attending the same event
                      </span>
                    </label>
                  </dd>
                </div>
              </dl>
              <div style={actionsRow}>
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  style={secondaryButton}
                  disabled={isSavingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...primaryButton,
                    opacity: isSavingProfile ? 0.8 : 1,
                    cursor: isSavingProfile ? "default" : "pointer",
                  }}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? "Saving…" : "Save"}
                </button>
              </div>
              {profileSuccessMessage ? <Alert variant="success" className="mt-[10px]">{profileSuccessMessage}</Alert> : null}
              {profileErrorMessage ? <Alert variant="error" className="mt-[10px]">{profileErrorMessage}</Alert> : null}
            </form>
          ) : profile ? (
            <>
              <dl style={detailsList}>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Name</dt>
                  <dd style={detailsValue}>{displayName}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Email</dt>
                  <dd style={detailsValue}>{fieldOrFallback(profile.email)}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Programme</dt>
                  <dd style={detailsValue}>{fieldOrFallback(profile.programme)}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Year</dt>
                  <dd style={detailsValue}>{fieldOrFallback(profile.year)}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Faculty</dt>
                  <dd style={detailsValue}>{fieldOrFallback(profile.faculty)}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>School</dt>
                  <dd style={detailsValue}>{fieldOrFallback(profile.school)}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>City</dt>
                  <dd style={detailsValue}>{fieldOrFallback(profile.city)}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Age group</dt>
                  <dd style={detailsValue}>{fieldOrFallback(profile.age_group)}</dd>
                </div>
                <div style={detailsRow}>
                  <dt style={detailsLabel}>Event attendee suggestions</dt>
                  <dd style={detailsValue}>
                    {profile.show_in_attendee_suggestions === false
                      ? "Hidden from attendee suggestions"
                      : "Shown with limited profile details"}
                  </dd>
                </div>
              </dl>
              <div style={actionsRow}>
                <button type="button" style={primaryButton} onClick={handleStartEditing}>
                  Edit profile
                </button>
              </div>
              {profileSuccessMessage ? <Alert variant="success" className="mt-[10px]">{profileSuccessMessage}</Alert> : null}
              {profileErrorMessage ? <Alert variant="error" className="mt-[10px]">{profileErrorMessage}</Alert> : null}
            </>
          ) : (
            <EmptyState
              align="left"
              title="Profile unavailable"
              description="We could not load your profile details right now."
            />
          )}
        </section>

        <section style={card}>
          <div style={profileHeader}>
            <div>
              <h2 style={sectionTitle}>Your interests</h2>
              <p style={profileSubtext}>
                Saved from the quiz and your selections. Used to personalize clubs and events.
              </p>
            </div>
            <button
              type="button"
              style={secondaryButton}
              onClick={() => navigate("/interests")}
            >
              Edit interests
            </button>
          </div>
          {isLoadingInterests ? (
            <LoadingState
              align="left"
              title="Loading interests"
              description="Fetching your saved preferences."
            />
          ) : !userId ? (
            <EmptyState
              align="left"
              title="Log in to see your interests"
              description="Your saved interests will appear here after sign in."
            />
          ) : groupedUserInterests.length > 0 ? (
            <div style={interestStack}>
              {groupedUserInterests.map(([categoryName, items]) => (
                <div key={categoryName} style={interestGroup}>
                  <p style={interestGroupTitle}>{categoryName}</p>
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
              title="No interests saved yet"
              description={INTERESTS_EMPTY_FOR_RECOMMENDATIONS}
              action={interestsEmptyAction}
            />
          )}
        </section>

        <section style={card}>
          <div style={profileHeader}>
            <div>
              <h2 style={sectionTitle}>Recommended clubs</h2>
              <p style={profileSubtext}>
                Discover clubs that match the interests saved on your profile.
              </p>
            </div>
          </div>

          {isLoadingRecommendedClubs ? (
            <LoadingState
              align="left"
              title="Loading club recommendations"
              description="Finding clubs that fit your saved interests."
            />
          ) : !userId ? (
            <EmptyState
              align="left"
              title="Log in to see recommended clubs"
              description="Your personalized club suggestions will appear here after sign in."
            />
          ) : !hasSavedInterests && recommendedClubs.length === 0 ? (
            <EmptyState
              align="left"
              title="No club recommendations yet"
              description={INTERESTS_EMPTY_FOR_RECOMMENDATIONS}
              action={interestsEmptyAction}
            />
          ) : recommendedClubs.length > 0 ? (
            <div style={recommendedClubGrid}>
              {recommendedClubs.map((club) => {
                const tags = [club.category_name].filter(Boolean);

                return (
                  <article key={club.id} style={recommendedClubCard}>
                    <div style={recommendedClubContent}>
                      <h3 style={recommendedClubTitle}>{club.name}</h3>
                      <p style={recommendedClubDescription}>
                        {club.description || "A club aligned with the interests you saved."}
                      </p>
                    </div>

                    <div style={chipWrap}>
                      {tags.map((tag) => (
                        <span key={`${club.id}-${tag}`} style={categoryTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              align="left"
              title="No club recommendations yet"
              description="Nothing matched your interests yet. Try adding more topics or check back as new clubs are added."
            />
          )}
        </section>

        <section style={card}>
          <div style={profileHeader}>
            <div>
              <h2 style={sectionTitle}>Recommended events</h2>
              <p style={profileSubtext}>
                Explore upcoming activities selected from the interests saved on your profile.
              </p>
            </div>
          </div>

          {isLoadingRecommendedEvents ? (
            <LoadingState
              align="left"
              title="Loading event recommendations"
              description="Looking for upcoming events that match your interests."
            />
          ) : !userId ? (
            <EmptyState
              align="left"
              title="Log in to see recommended events"
              description="Your personalized event suggestions will appear here after sign in."
            />
          ) : upcomingRecommendedEvents.length > 0 ? (
            <div style={recommendedEventList}>
              {upcomingRecommendedEvents.map((event) => (
                <article key={event.id} style={recommendedEventCard}>
                  <div style={recommendedEventHeader}>
                    <h3 style={recommendedEventTitle}>{event.title}</h3>
                    <p style={recommendedEventDate}>{formatEventDate(event.date || event.start_time)}</p>
                  </div>
                  <p style={recommendedEventDescription}>
                    {event.description || "An upcoming activity selected from the interests you saved."}
                  </p>
                  <Link to={`/events/${event.id}`} style={recommendedEventDetailLink}>
                    View event details →
                  </Link>
                </article>
              ))}
            </div>
          ) : !hasSavedInterests ? (
            <EmptyState
              align="left"
              title="No upcoming event recommendations yet"
              description={INTERESTS_EMPTY_FOR_RECOMMENDATIONS}
              action={interestsEmptyAction}
            />
          ) : (
            <EmptyState
              align="left"
              title={
                recommendedEvents.length > 0
                  ? "No upcoming recommendations"
                  : "No events available."
              }
              description={
                recommendedEvents.length > 0
                  ? "Past events are hidden here so your dashboard stays focused on what is next."
                  : undefined
              }
            />
          )}
        </section>

        <section style={card}>
          <h2 style={sectionTitle}>System overview</h2>
          {usersCount !== null ? (
            <p style={bodyText}>
              <strong>{usersCount}</strong> registered user{usersCount === 1 ? "" : "s"}
            </p>
          ) : (
            <LoadingState
              align="left"
              title="Loading user statistics"
              description="Fetching latest system overview metrics."
            />
          )}

          {categories.length > 0 ? (
            <div style={{ marginTop: "16px" }}>
              <h3 style={subheading}>Interest categories</h3>
              <ul style={list}>
                {categories.map((c) => (
                  <li key={c.id} style={listItem}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    {c.description ? (
                      <span style={listItemDescription}> – {c.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              align="left"
              title="No interest categories available"
              description="Add categories to make this section useful."
            />
          )}
        </section>
      </div>

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
    </div>
  );
}

const container = {
  width: "100%",
  maxWidth: "1080px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(14px, 3vw, 24px)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
};

const title = {
  margin: 0,
  color: "black",
  fontSize: "28px",
  fontWeight: 700,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "20px",
};

const card = {
  padding: "clamp(14px, 3.5vw, 24px)",
  borderRadius: "20px",
  border: "1px solid rgba(17, 24, 39, 0.08)",
  background: "white",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
};

const sectionTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: 700,
};

const bodyText = {
  margin: 0,
  color: "black",
  fontSize: "14px",
};

const subheading = {
  margin: 0,
  marginBottom: "8px",
  color: "black",
  fontSize: "15px",
  fontWeight: 600,
};

const list = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const listItem = {
  color: "black",
  fontSize: "14px",
};

const listItemDescription = {
  opacity: 0.75,
};

const detailsList = {
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
};

const detailsRow = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  margin: 0,
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const detailsLabel = {
  fontSize: "12px",
  color: "#4b5563",
  fontWeight: 600,
};

const detailsValue = {
  margin: 0,
  fontSize: "14px",
  color: "#111827",
};

const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  color: "#111827",
  background: "white",
  boxSizing: "border-box",
};

const actionsRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "16px",
};

const primaryButton = {
  borderRadius: "999px",
  border: "none",
  padding: "10px 18px",
  background: "#111827",
  color: "white",
  fontSize: "14px",
  fontWeight: 600,
};

const secondaryButton = {
  borderRadius: "999px",
  border: "1px solid #d1d5db",
  padding: "10px 18px",
  background: "white",
  color: "#111827",
  fontSize: "14px",
  fontWeight: 600,
};

const skeletonStack = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const skeletonLine = {
  height: "12px",
  borderRadius: "999px",
};

const profileHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "14px",
  flexWrap: "wrap",
};

const profileSubtext = {
  margin: "6px 0 0 0",
  color: "#4b5563",
  fontSize: "14px",
};

const readonlyValue = {
  display: "inline-block",
  padding: "8px 10px",
  borderRadius: "8px",
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
};

const checkboxLabel = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  color: "#111827",
  fontSize: "14px",
  lineHeight: 1.45,
};

const interestStack = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const interestGroup = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#fafafa",
};

const interestGroupTitle = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 700,
  color: "#374151",
};

const chipWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "10px",
};

const interestChip = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "white",
  border: "1px solid #d1d5db",
  color: "#111827",
  fontSize: "13px",
  fontWeight: 600,
};

const savedItemsSubheading = {
  margin: "0 0 10px 0",
  fontSize: "14px",
  fontWeight: 700,
  color: "#374151",
};

const savedItemsGrid = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const savedItemCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 16px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#fafafa",
};

const savedItemCardBody = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: 0,
};

const savedItemTitle = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#111827",
  textDecoration: "none",
};

const savedItemMeta = {
  margin: 0,
  fontSize: "13px",
  color: "#6b7280",
};

const recommendedClubGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const recommendedClubCard = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "14px",
  minHeight: "180px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
};

const recommendedClubContent = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const recommendedClubTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
};

const recommendedClubDescription = {
  margin: 0,
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.5,
};

const categoryTag = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "#eef2ff",
  border: "1px solid #c7d2fe",
  color: "#3730a3",
  fontSize: "12px",
  fontWeight: 700,
};

const similarPeopleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};

const similarPersonCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
};

const similarPersonAvatar = {
  width: "42px",
  height: "42px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  background: "#111827",
  color: "white",
  fontSize: "16px",
  fontWeight: 800,
};

const similarPersonContent = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const similarPersonName = {
  margin: 0,
  color: "#111827",
  fontSize: "17px",
  fontWeight: 700,
};

const similarPersonMeta = {
  margin: 0,
  color: "#4b5563",
  fontSize: "13px",
  lineHeight: 1.4,
};

const similarPersonMatch = {
  margin: "4px 0 0 0",
  color: "#047857",
  fontSize: "13px",
  fontWeight: 800,
};

const sharedInterestChip = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 10px",
  borderRadius: "999px",
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  color: "#065f46",
  fontSize: "12px",
  fontWeight: 700,
};

const recommendedEventList = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const recommendedEventCard = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
};

const recommendedEventHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const recommendedEventTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
};

const recommendedEventDate = {
  margin: 0,
  color: "#1d4ed8",
  fontSize: "13px",
  fontWeight: 700,
};

const recommendedEventDescription = {
  margin: 0,
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.5,
};

const recommendedEventDetailLink = {
  display: "inline-flex",
  marginTop: "12px",
  fontSize: "14px",
  fontWeight: 700,
  color: "#1d4ed8",
  textDecoration: "none",
};

const attendingLinksBlock = {
  marginTop: "24px",
  paddingTop: "20px",
  borderTop: "1px solid #e5e7eb",
};

const attendingLinksHeading = {
  margin: "0 0 14px",
  fontSize: "14px",
  fontWeight: 800,
  color: "#374151",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const attendingLinksList = {
  margin: 0,
  padding: "0 0 0 18px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const attendingLinksItem = {
  margin: 0,
  padding: 0,
  lineHeight: 1.45,
};

const attendingLinksOnly = {
  color: "#1d4ed8",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "underline",
};

const joinedClubsBlock = {
  marginTop: "24px",
  paddingTop: "20px",
  borderTop: "1px solid #e5e7eb",
};

const joinedClubsHeading = {
  margin: "0 0 14px",
  fontSize: "14px",
  fontWeight: 800,
  color: "#374151",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const joinedClubsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "12px",
};

const joinedClubCard = {
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
};

const joinedClubCardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const joinedClubCardTitle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 700,
  color: "#111827",
  textDecoration: "none",
};

const joinedClubCategoryLine = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
};

const joinedClubDateLine = {
  margin: "8px 0 0 0",
  fontSize: "12px",
  fontWeight: 500,
  color: "#6b7280",
};
