import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client.js";

const card = {
  padding: "24px",
  borderRadius: "20px",
  border: "1px solid rgba(17, 24, 39, 0.08)",
  background: "white",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
};

const title = {
  margin: 0,
  color: "#111827",
  fontSize: "22px",
  fontWeight: 700,
};

const subtitle = {
  margin: "8px 0 0 0",
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: 1.55,
};

const formStyles = {
  form: {
    marginTop: "22px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "520px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { color: "#111827", fontSize: "13px", fontWeight: 700 },
  input: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    outline: "none",
    color: "#111827",
    background: "rgba(255, 255, 255, 0.92)",
    fontSize: "14px",
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    outline: "none",
    color: "#111827",
    background: "rgba(255, 255, 255, 0.92)",
    fontSize: "14px",
    minHeight: "100px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  select: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    outline: "none",
    color: "#111827",
    background: "rgba(255, 255, 255, 0.92)",
    fontSize: "14px",
  },
  row: { display: "flex", alignItems: "center", gap: "10px" },
  checkbox: { width: "18px", height: "18px", cursor: "pointer" },
  button: {
    marginTop: "6px",
    padding: "12px 20px",
    borderRadius: "999px",
    border: "none",
    background: "#111827",
    color: "white",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  error: {
    margin: 0,
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: 700,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  success: {
    margin: 0,
    color: "#166534",
    fontSize: "13px",
    fontWeight: 700,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  hint: { margin: 0, fontSize: "12px", color: "#6b7280" },
};

export default function AdminClubs() {
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const list = await apiFetch("/interest-categories");
        if (!ignore) setCategories(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!ignore) setLoadError(e.message || "Could not load categories.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setCategoryId("");
    setCity("");
    setLocation("");
    setWebsiteUrl("");
    setIsActive(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSubmitError("Club name is required.");
      return;
    }

    const urlTrim = websiteUrl.trim();
    if (urlTrim) {
      const low = urlTrim.toLowerCase();
      if (!low.startsWith("http://") && !low.startsWith("https://")) {
        setSubmitError("Website URL must start with http:// or https://.");
        return;
      }
    }

    const body = {
      name: trimmedName,
      description: description.trim() || null,
      category_id: categoryId || null,
      city: city.trim() || null,
      location: location.trim() || null,
      website_url: urlTrim || null,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      const created = await apiFetch("/admin/clubs", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSuccessMessage(`Club created (id: ${created.id}).`);
      resetForm();
    } catch (err) {
      setSubmitError(err.message || "Could not create club.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={card}>
      <h2 style={title}>Clubs management</h2>
      <p style={subtitle}>Create a new club. Only administrators can submit this form.</p>

      {loadError ? <p style={formStyles.error}>{loadError}</p> : null}

      <form style={formStyles.form} onSubmit={handleSubmit}>
        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="club-name">
            Name <span style={{ color: "#b91c1c" }}>*</span>
          </label>
          <input
            id="club-name"
            style={formStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            required
            autoComplete="off"
          />
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="club-description">
            Description
          </label>
          <textarea
            id="club-description"
            style={formStyles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
          <p style={formStyles.hint}>Up to 1000 characters.</p>
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="club-category">
            Interest category
          </label>
          <select
            id="club-category"
            style={formStyles.select}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="club-city">
            City
          </label>
          <input
            id="club-city"
            style={formStyles.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            autoComplete="address-level2"
          />
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="club-location">
            Location / venue
          </label>
          <input
            id="club-location"
            style={formStyles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={255}
          />
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="club-website">
            Website URL
          </label>
          <input
            id="club-website"
            style={formStyles.input}
            type="url"
            placeholder="https://"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            maxLength={500}
          />
        </div>

        <div style={formStyles.row}>
          <input
            id="club-active"
            type="checkbox"
            style={formStyles.checkbox}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label style={{ ...formStyles.label, fontWeight: 600, cursor: "pointer" }} htmlFor="club-active">
            Active (visible in listings)
          </label>
        </div>

        {submitError ? <p style={formStyles.error}>{submitError}</p> : null}
        {successMessage ? <p style={formStyles.success}>{successMessage}</p> : null}

        <button
          type="submit"
          style={{
            ...formStyles.button,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? "default" : "pointer",
          }}
          disabled={isSubmitting || !!loadError}
        >
          {isSubmitting ? "Creating…" : "Create club"}
        </button>
      </form>
    </div>
  );
}
