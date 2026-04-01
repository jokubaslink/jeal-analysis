import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle, Input, Label, Select, Textarea } from "../../components/ui/index.js";

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

const fieldClass = "flex flex-col gap-[length:var(--space-2)]";
const hintClass = "m-0 text-[length:var(--font-size-caption)] text-[var(--color-ink-subtle)]";
const formMax = "max-w-[520px]";

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
    <Card className={formMax}>
      <CardTitle>Events management</CardTitle>
      <CardDescription>
        Create a new event. Times use your local timezone and are sent to the API in UTC.
      </CardDescription>

      {loadError ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="error">{loadError}</Alert>
        </div>
      ) : null}

      <form className="mt-[length:var(--space-10)] flex flex-col gap-[length:var(--space-7)]" onSubmit={handleSubmit}>
        <div className={fieldClass}>
          <Label htmlFor="event-title">
            Title <span className="text-[var(--color-error-text)]">*</span>
          </Label>
          <Input
            id="event-title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            maxLength={255}
            required
            autoComplete="off"
          />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={5}
          />
          <p className={hintClass}>Up to 2000 characters.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-category">Interest category</Label>
          <Select id="event-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-club">Club</Label>
          <Select id="event-club" value={clubId} onChange={(e) => setClubId(e.target.value)}>
            <option value="">— None —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-start">
            Start <span className="text-[var(--color-error-text)]">*</span>
          </Label>
          <Input
            id="event-start"
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            required
          />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-end">End</Label>
          <Input id="event-end" type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
          <p className={hintClass}>Optional. Must be on or after start.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-city">City</Label>
          <Input
            id="event-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            autoComplete="address-level2"
          />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-location">Location</Label>
          <Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={255} />
        </div>

        <div className="flex items-center gap-[length:var(--space-4)]">
          <input
            id="event-online"
            type="checkbox"
            className="h-[18px] w-[18px] cursor-pointer accent-[var(--color-ink)]"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
          />
          <Label htmlFor="event-online" className="mb-0 cursor-pointer font-semibold">
            Online event
          </Label>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-registration">Registration URL</Label>
          <Input
            id="event-registration"
            type="url"
            placeholder="https://"
            value={registrationUrl}
            onChange={(e) => setRegistrationUrl(e.target.value)}
            maxLength={500}
          />
        </div>

        {submitError ? <Alert variant="error">{submitError}</Alert> : null}
        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <Button type="submit" disabled={isSubmitting || !!loadError}>
          {isSubmitting ? "Creating…" : "Create event"}
        </Button>
      </form>
    </Card>
  );
}
