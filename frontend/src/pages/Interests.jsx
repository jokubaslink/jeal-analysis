import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";

export default function Interests() {
  const navigate = useNavigate();
  const { userId, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [interests, setInterests] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const validationMessage = "Please select at least one interest.";

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    setSaveSuccessMessage("");
    setSaveErrorMessage("");
    try {
      const requests = [
        apiFetch("/interest-categories"),
        apiFetch("/interests"),
      ];

      if (userId) {
        requests.push(apiFetch(`/users/${userId}/interests`));
      }

      const [cats, ints, userInts] = await Promise.all(requests);

      setCategories(Array.isArray(cats) ? cats : []);
      setInterests(Array.isArray(ints) ? ints : []);

      if (userId && Array.isArray(userInts)) {
        // backend returns objects with `interest_id`
        setSelectedIds(new Set(userInts.map((i) => i.interest_id)));
      }
    } catch (e) {
      setError(e.message || "Failed to load interests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const requests = [
          apiFetch("/interest-categories"),
          apiFetch("/interests"),
        ];
        if (userId) {
          requests.push(apiFetch(`/users/${userId}/interests`));
        }

        const [cats, ints, userInts] = await Promise.all(requests);
        if (ignore) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setInterests(Array.isArray(ints) ? ints : []);
        if (userId && Array.isArray(userInts)) {
          // backend returns objects with `interest_id`
          setSelectedIds(new Set(userInts.map((i) => i.interest_id)));
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load interests.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [userId]);

  const handleToggleInterest = (id) => {
    setSaveSuccessMessage("");
    setSaveErrorMessage("");
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }
    if (selectedIds.size === 0) return;

    setIsSaving(true);
    setSaveSuccessMessage("");
    setSaveErrorMessage("");

    const payload = {
      // backend expects `items: [{ interest_id, level }]`
      items: Array.from(selectedIds).map((id) => ({
        interest_id: id,
        level: null,
      })),
    };

    try {
      await apiFetch(`/users/${userId}/interests`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSaveSuccessMessage("Your interests have been saved successfully.");
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        setSaveErrorMessage("Please log in again.");
        logout();
        navigate("/login");
        return;
      }

      setSaveErrorMessage(
        e.detail ?? e.message ?? "Failed to save interests."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const anySelected = selectedIds.size > 0;

  return (
    <div style={container}>
      <header style={header}>
        <div>
          <h1 style={title}>Interests</h1>
          <p style={subtitle}>
            Choose the activities and topics that match your preferences.
          </p>
        </div>
        <div style={headerActions}>
          {anySelected ? (
            <div style={pill}>
              <span style={pillDot} />
              <span style={pillText}>
                {selectedIds.size} interest
                {selectedIds.size === 1 ? "" : "s"} selected
              </span>
            </div>
          ) : null}
          {saveSuccessMessage ? (
            <p style={successText}>{saveSuccessMessage}</p>
          ) : null}
          {saveErrorMessage ? (
            <p style={errorText}>{saveErrorMessage}</p>
          ) : null}
          {!anySelected ? (
            <p style={validationText}>{validationMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            style={{
              ...primaryButton,
              opacity: isSaving || !anySelected ? 0.8 : 1,
              cursor: isSaving || !anySelected ? "default" : "pointer",
            }}
            disabled={isSaving || !userId || !anySelected}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <section style={card}>
        {isLoading ? (
          <div style={skeletonStack}>
            <div style={skeletonLine} />
            <div style={skeletonLine} />
            <div style={skeletonLine} />
            <div style={skeletonLine} />
          </div>
        ) : error ? (
          <div style={centered}>
            <p style={errorText}>{error}</p>
            <button type="button" onClick={loadData} style={primaryButton}>
              Retry
            </button>
          </div>
        ) : categories.length === 0 ? (
          <p style={mutedText}>No interest categories are available yet.</p>
        ) : (
          <div style={categoriesGrid}>
            {categories.map((category) => {
              const items = interests.filter(
                (i) => i.category_id === category.id
              );
              if (items.length === 0) {
                return null;
              }
              return (
                <div key={category.id} style={categoryCard}>
                  <div style={categoryHeader}>
                    <h2 style={categoryTitle}>{category.name}</h2>
                    {category.description ? (
                      <p style={categoryDescription}>
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <ul style={interestList}>
                    {items.map((interest) => {
                      const checked = selectedIds.has(interest.id);
                      return (
                        <li key={interest.id}>
                          <button
                            type="button"
                            onClick={() => handleToggleInterest(interest.id)}
                            style={{
                              ...interestRow,
                              borderColor: checked ? "#111827" : "#e5e7eb",
                              backgroundColor: checked
                                ? "#111827"
                                : "white",
                              color: checked ? "white" : "black",
                            }}
                          >
                            <span style={interestCheckboxOuter}>
                              <span
                                style={{
                                  ...interestCheckboxInner,
                                  opacity: checked ? 1 : 0,
                                  transform: checked
                                    ? "scale(1)"
                                    : "scale(0.8)",
                                }}
                              />
                            </span>
                            <span style={interestLabel}>
                              {interest.name}
                              {interest.description ? (
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "12px",
                                    opacity: checked ? 0.9 : 0.7,
                                  }}
                                >
                                  {interest.description}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const container = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
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

const card = {
  padding: "20px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  background: "white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
};

const categoriesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const categoryCard = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  padding: "12px",
  boxSizing: "border-box",
};

const categoryHeader = {
  marginBottom: "8px",
};

const categoryTitle = {
  margin: 0,
  color: "black",
  fontSize: "16px",
  fontWeight: 600,
};

const categoryDescription = {
  margin: "4px 0 0 0",
  color: "black",
  opacity: 0.75,
  fontSize: "13px",
};

const interestList = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const interestRow = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: "999px",
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  fontSize: "14px",
};

const interestCheckboxOuter = {
  width: "18px",
  height: "18px",
  borderRadius: "999px",
  border: "2px solid currentColor",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const interestCheckboxInner = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  backgroundColor: "currentColor",
  transition: "opacity 0.15s ease, transform 0.15s ease",
};

const interestLabel = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

const mutedText = {
  margin: 0,
  color: "black",
  opacity: 0.6,
  fontSize: "14px",
};

const errorText = {
  margin: "0 0 12px 0",
  color: "#dc2626",
  fontSize: "14px",
};

const validationText = {
  margin: "0 0 12px 0",
  color: "#b45309",
  fontSize: "14px",
};

const successText = {
  margin: "0 0 12px 0",
  color: "#16a34a",
  fontSize: "14px",
};

const primaryButton = {
  borderRadius: "999px",
  border: "none",
  padding: "8px 16px",
  background: "#111827",
  color: "white",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const skeletonStack = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const skeletonLine = {
  height: "14px",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 40%, #f3f4f6 80%)",
  backgroundSize: "200% 100%",
  animation: "jeal-skeleton-pulse 1.4s ease-in-out infinite",
};

const centered = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const pill = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#111827",
};

const pillDot = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  backgroundColor: "#22c55e",
};

const pillText = {
  color: "white",
  fontSize: "12px",
  fontWeight: 500,
};

