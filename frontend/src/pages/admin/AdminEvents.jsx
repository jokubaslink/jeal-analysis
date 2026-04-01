import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client.js";

/** Parse `datetime-local` value as local wall time and return ISO 8601 UTC string. */
function datetimeLocalToIso(value) {
  if (!value || !value.includes("T")) return null;
  const [datePart, timePart] = value.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const timeBits = (timePart || "0").split(":");
  const h = Number(timeBits[0]) || 0;
  const mi = Number(timeBits[1]) || 0;
  const local = new Date(y, mo - 1, d, h, mi, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

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

export default function AdminEvents() {
  const [categories, setCategories] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [clubId, setClubId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState("");

  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [cats, clubList] = await Promise.all([
          apiFetch("/interest-categories"),
          apiFetch("/clubs"),
        ]);
        if (!ignore) {
          setCategories(Array.isArray(cats) ? cats : []);
          setClubs(Array.isArray(clubList) ? clubList : []);
        }
      } catch (e) {
        if (!ignore) setLoadError(e.message || "Could not load form data.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  function resetForm() {
    setEventTitle("");
    setDescription("");
    setCategoryId("");
    setClubId("");
    setStartLocal("");
    setEndLocal("");
    setCity("");
    setLocation("");
    setIsOnline(false);
    setRegistrationUrl("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const trimmedTitle = eventTitle.trim();
    if (!trimmedTitle) {
      setSubmitError("Event title is required.");
      return;
    }

    if (!startLocal) {
      setSubmitError("Start date and time are required.");
      return;
    }

    const startIso = datetimeLocalToIso(startLocal);
    if (!startIso) {
      setSubmitError("Invalid start date or time.");
      return;
    }

    let endIso = null;
    if (endLocal.trim()) {
      endIso = datetimeLocalToIso(endLocal);
      if (!endIso) {
        setSubmitError("Invalid end date or time.");
        return;
      }
      if (new Date(endIso) < new Date(startIso)) {
        setSubmitError("End time must be on or after start time.");
        return;
      }
    }

    const regTrim = registrationUrl.trim();
    if (regTrim) {
      const low = regTrim.toLowerCase();
      if (!low.startsWith("http://") && !low.startsWith("https://")) {
        setSubmitError("Registration URL must start with http:// or https://.");
        return;
      }
    }

    const body = {
      title: trimmedTitle,
      description: description.trim() || null,
      category_id: categoryId || null,
      club_id: clubId || null,
      start_time: startIso,
      end_time: endIso,
      city: city.trim() || null,
      location: location.trim() || null,
      is_online: isOnline,
      registration_url: regTrim || null,
    };

    setIsSubmitting(true);
    try {
      const created = await apiFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSuccessMessage(`Event created (id: ${created.id}).`);
      resetForm();
    } catch (err) {
      setSubmitError(err.message || "Could not create event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={card}>
      <h2 style={title}>Events management</h2>
      <p style={subtitle}>Create a new event. Times use your local timezone and are sent to the API in UTC.</p>

      {loadError ? <p style={formStyles.error}>{loadError}</p> : null}

      <form style={formStyles.form} onSubmit={handleSubmit}>
        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-title">
            Title <span style={{ color: "#b91c1c" }}>*</span>
          </label>
          <input
            id="event-title"
            style={formStyles.input}
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            maxLength={255}
            required
            autoComplete="off"
          />
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-description">
            Description
          </label>
          <textarea
            id="event-description"
            style={formStyles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
          <p style={formStyles.hint}>Up to 2000 characters.</p>
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-category">
            Interest category
          </label>
          <select
            id="event-category"
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
          <label style={formStyles.label} htmlFor="event-club">
            Club
          </label>
          <select
            id="event-club"
            style={formStyles.select}
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
          >
            <option value="">— None —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-start">
            Start <span style={{ color: "#b91c1c" }}>*</span>
          </label>
          <input
            id="event-start"
            style={formStyles.input}
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            required
          />
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-end">
            End
          </label>
          <input
            id="event-end"
            style={formStyles.input}
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
          />
          <p style={formStyles.hint}>Optional. Must be on or after start.</p>
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-city">
            City
          </label>
          <input
            id="event-city"
            style={formStyles.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            autoComplete="address-level2"
          />
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-location">
            Location
          </label>
          <input
            id="event-location"
            style={formStyles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={255}
          />
        </div>

        <div style={formStyles.row}>
          <input
            id="event-online"
            type="checkbox"
            style={formStyles.checkbox}
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
          />
          <label style={{ ...formStyles.label, fontWeight: 600, cursor: "pointer" }} htmlFor="event-online">
            Online event
          </label>
        </div>

        <div style={formStyles.field}>
          <label style={formStyles.label} htmlFor="event-registration">
            Registration URL
          </label>
          <input
            id="event-registration"
            style={formStyles.input}
            type="url"
            placeholder="https://"
            value={registrationUrl}
            onChange={(e) => setRegistrationUrl(e.target.value)}
            maxLength={500}
          />
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
          {isSubmitting ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
