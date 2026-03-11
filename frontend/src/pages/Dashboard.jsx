import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";

export default function Dashboard() {
  const { userId } = useAuth();
  const [usersCount, setUsersCount] = useState(null);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        // Load current user profile
        if (userId) {
          const me = await apiFetch(`/users/${userId}`);
          if (!ignore) {
            setProfile(me);
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
        if (!ignore) setIsLoadingProfile(false);
      }
    };
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const displayName =
    profile?.name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Not provided";

  const fieldOrFallback = (value) =>
    value !== null && value !== undefined && String(value).trim() !== ""
      ? value
      : "Not provided";

  return (
    <div style={container}>
      <div style={headerRow}>
        <div>
          <h1 style={title}>Dashboard</h1>
          <p style={subtitle}>You are logged in.</p>
        </div>
      </div>

      <div style={grid}>
        <section style={card}>
          <h2 style={sectionTitle}>Your profile</h2>

          {isLoadingProfile ? (
            <div style={skeletonStack}>
              <div style={skeletonLine} />
              <div style={skeletonLine} />
              <div style={skeletonLine} />
              <div style={skeletonLine} />
            </div>
          ) : !userId ? (
            <p style={mutedText}>No user is currently associated with this session.</p>
          ) : profile ? (
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
          ) : (
            <p style={mutedText}>We could not load your profile details.</p>
          )}
        </section>

        <section style={card}>
          <h2 style={sectionTitle}>System overview</h2>
          {usersCount !== null ? (
            <p style={bodyText}>
              <strong>{usersCount}</strong> registered user{usersCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p style={mutedText}>Loading user statistics…</p>
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
            <p style={mutedText}>No interest categories available yet.</p>
          )}
        </section>
      </div>

      {errorMessage ? <p style={errorText}>{errorMessage}</p> : null}
    </div>
  );
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
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

const subtitle = {
  margin: "4px 0 0 0",
  color: "black",
  opacity: 0.7,
  fontSize: "14px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
  gap: "20px",
};

const card = {
  padding: "20px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  background: "white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
};

const sectionTitle = {
  margin: 0,
  marginBottom: "12px",
  color: "black",
  fontSize: "18px",
  fontWeight: 600,
};

const bodyText = {
  margin: 0,
  color: "black",
  fontSize: "14px",
};

const mutedText = {
  margin: 0,
  color: "black",
  opacity: 0.6,
  fontSize: "14px",
};

const errorText = {
  margin: 0,
  marginTop: "8px",
  color: "#dc2626",
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
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px 16px",
};

const detailsRow = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const detailsLabel = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "black",
  opacity: 0.6,
};

const detailsValue = {
  fontSize: "14px",
  color: "black",
};

const skeletonStack = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const skeletonLine = {
  height: "12px",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 40%, #f3f4f6 80%)",
  backgroundSize: "200% 100%",
  animation: "jeal-skeleton-pulse 1.4s ease-in-out infinite",
};