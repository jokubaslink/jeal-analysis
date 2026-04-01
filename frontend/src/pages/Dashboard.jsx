import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";
import { syncPendingOnboardingToUser } from "../onboarding/syncOnboardingToUser.js";
import { Alert, EmptyState, LoadingState, Skeleton } from "../components/ui/index.js";

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

          const me = await apiFetch(`/users/${userId}`);
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
            });
          }

          let interestsPayload = [];
          try {
            const raw = await apiFetch(`/users/${userId}/interests`);
            interestsPayload = Array.isArray(raw) ? raw : [];
          } catch {
            interestsPayload = [];
          }
          if (!ignore) {
            setUserInterests(interestsPayload);
          }
        } else {
          if (!ignore) {
            setUserInterests([]);
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
        }
      }
    };
    loadData();
    return () => {
      ignore = true;
    };
  }, [userId]);

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

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Not provided";

  const fieldOrFallback = (value) =>
    value !== null && value !== undefined && String(value).trim() !== ""
      ? value
      : "Not provided";

  const handleProfileInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
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
      setProfile(updated);
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
              description="Complete the quiz or add interests to improve recommendations."
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
