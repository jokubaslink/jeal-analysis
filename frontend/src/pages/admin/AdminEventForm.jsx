import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { isoToDatetimeLocal } from "../../lib/adminDatetime.js";
import { mapApiValidationToFieldErrors, validateEventAdminForm } from "../../lib/adminFormValidation.js";
import { Alert, Button, Card, CardDescription, CardTitle, Input, Label, Select, Textarea } from "../../components/ui/index.js";
import AdminFieldError from "./AdminFieldError.jsx";

const fieldClass = "flex flex-col gap-[length:var(--space-2)]";
const hintClass = "m-0 text-[length:var(--font-size-caption)] text-[var(--color-ink-subtle)]";

export default function AdminEventForm() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!eventId;

  const [categories, setCategories] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [clubId, setClubId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setLoadError("");

    (async () => {
      try {
        const [cats, clubList] = await Promise.all([apiFetch("/interest-categories"), apiFetch("/clubs")]);
        if (ignore) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setClubs(Array.isArray(clubList) ? clubList : []);

        if (isEditMode) {
          const event = await apiFetch(`/admin/events/${eventId}`);
          if (ignore) return;
          setEventTitle(event.title || "");
          setDescription(event.description || "");
          setCategoryId(event.category_id || "");
          setClubId(event.club_id || "");
          setStartLocal(isoToDatetimeLocal(event.start_time));
          setEndLocal(isoToDatetimeLocal(event.end_time));
          setCity(event.city || "");
          setLocation(event.location || "");
          setLatitude(event.latitude != null ? String(event.latitude) : "");
          setLongitude(event.longitude != null ? String(event.longitude) : "");
          setIsOnline(Boolean(event.is_online));
          setRegistrationUrl(event.registration_url || "");
          setImageUrl(event.image_url || "");
        }
      } catch (e) {
        if (!ignore) setLoadError(e.message || "Could not load form data.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [eventId, isEditMode]);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSubmitError("");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setFieldErrors({});

    const { errors, startIso, endIso, trimmed } = validateEventAdminForm({
      title: eventTitle,
      description,
      startLocal,
      endLocal,
      city,
      location,
      latitude,
      longitude,
      registrationUrl,
      imageUrl,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError("Please fix the fields below before saving.");
      const first = document.querySelector("[aria-invalid='true']");
      first?.focus?.();
      return;
    }

    const body = {
      title: trimmed.title,
      description: trimmed.description,
      category_id: categoryId || null,
      club_id: clubId || null,
      start_time: startIso,
      end_time: endIso,
      city: trimmed.city,
      location: trimmed.location,
      latitude: trimmed.latitude,
      longitude: trimmed.longitude,
      is_online: isOnline,
      registration_url: trimmed.registration_url,
      image_url: trimmed.image_url,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await apiFetch(`/admin/events/${eventId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        navigate("/admin/events", { state: { flashMessage: "Event updated." } });
      } else {
        await apiFetch("/admin/events", {
          method: "POST",
          body: JSON.stringify(body),
        });
        navigate("/admin/events", { state: { flashMessage: "Event created." } });
      }
    } catch (err) {
      if (err.status === 422 && err.payload?.detail) {
        const mapped = mapApiValidationToFieldErrors(err.payload.detail);
        setFieldErrors(mapped);
        setSubmitError("The server could not save this event. Fix the highlighted fields.");
      } else {
        setSubmitError(err.message || (isEditMode ? "Could not update event." : "Could not create event."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle>{isEditMode ? "Edit event" : "Create event"}</CardTitle>
      <CardDescription>
        {isEditMode
          ? "Update event details and save changes."
          : "Create a new event. Only administrators can submit this form."}
      </CardDescription>

      <div className="mt-[length:var(--space-7)]">
        <Link to="/admin/events" className="text-sm text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]">
          ← Back to all events
        </Link>
      </div>

      {loadError ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="error">{loadError}</Alert>
        </div>
      ) : null}

      <form className="mt-[length:var(--space-10)] flex flex-col gap-[length:var(--space-7)]" onSubmit={handleSubmit} noValidate>
        <div className={fieldClass}>
          <Label htmlFor="event-title">
            Title <span className="text-[var(--color-error-text)]">*</span>
          </Label>
          <Input
            id="event-title"
            value={eventTitle}
            onChange={(e) => {
              setEventTitle(e.target.value);
              clearFieldError("title");
            }}
            maxLength={255}
            autoComplete="off"
            aria-invalid={fieldErrors.title ? "true" : "false"}
            aria-describedby={fieldErrors.title ? "event-title-error" : undefined}
          />
          <AdminFieldError id="event-title-error" message={fieldErrors.title} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldError("description");
            }}
            maxLength={2000}
            rows={5}
            aria-invalid={fieldErrors.description ? "true" : "false"}
            aria-describedby={fieldErrors.description ? "event-description-error" : undefined}
          />
          <AdminFieldError id="event-description-error" message={fieldErrors.description} />
          <p className={hintClass}>Up to 2000 characters.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-category">Interest category</Label>
          <Select
            id="event-category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              clearFieldError("category_id");
            }}
            aria-invalid={fieldErrors.category_id ? "true" : "false"}
            aria-describedby={fieldErrors.category_id ? "event-category-error" : undefined}
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <AdminFieldError id="event-category-error" message={fieldErrors.category_id} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-club">Club</Label>
          <Select
            id="event-club"
            value={clubId}
            onChange={(e) => {
              setClubId(e.target.value);
              clearFieldError("club_id");
            }}
            aria-invalid={fieldErrors.club_id ? "true" : "false"}
            aria-describedby={fieldErrors.club_id ? "event-club-error" : undefined}
          >
            <option value="">— None —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <AdminFieldError id="event-club-error" message={fieldErrors.club_id} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-start">
            Start <span className="text-[var(--color-error-text)]">*</span>
          </Label>
          <Input
            id="event-start"
            type="datetime-local"
            value={startLocal}
            onChange={(e) => {
              setStartLocal(e.target.value);
              clearFieldError("start_time");
            }}
            aria-invalid={fieldErrors.start_time ? "true" : "false"}
            aria-describedby={fieldErrors.start_time ? "event-start-error" : undefined}
          />
          <AdminFieldError id="event-start-error" message={fieldErrors.start_time} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-end">End</Label>
          <Input
            id="event-end"
            type="datetime-local"
            value={endLocal}
            onChange={(e) => {
              setEndLocal(e.target.value);
              clearFieldError("end_time");
            }}
            aria-invalid={fieldErrors.end_time ? "true" : "false"}
            aria-describedby={fieldErrors.end_time ? "event-end-error" : undefined}
          />
          <AdminFieldError id="event-end-error" message={fieldErrors.end_time} />
          <p className={hintClass}>Optional. Must be on or after start.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-city">City</Label>
          <Input
            id="event-city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              clearFieldError("city");
            }}
            maxLength={100}
            autoComplete="address-level2"
            aria-invalid={fieldErrors.city ? "true" : "false"}
            aria-describedby={fieldErrors.city ? "event-city-error" : undefined}
          />
          <AdminFieldError id="event-city-error" message={fieldErrors.city} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              clearFieldError("location");
            }}
            maxLength={255}
            aria-invalid={fieldErrors.location ? "true" : "false"}
            aria-describedby={fieldErrors.location ? "event-location-error" : undefined}
          />
          <AdminFieldError id="event-location-error" message={fieldErrors.location} />
        </div>

        <div className="grid grid-cols-2 gap-[length:var(--space-4)]">
          <div className={fieldClass}>
            <Label htmlFor="event-latitude">Latitude</Label>
            <Input
              id="event-latitude"
              type="number"
              step="any"
              placeholder="e.g. 54.6872"
              value={latitude}
              onChange={(e) => {
                setLatitude(e.target.value);
                clearFieldError("latitude");
              }}
              aria-invalid={fieldErrors.latitude ? "true" : "false"}
              aria-describedby={fieldErrors.latitude ? "event-latitude-error" : undefined}
            />
            <AdminFieldError id="event-latitude-error" message={fieldErrors.latitude} />
            <p className={hintClass}>Optional. Between −90 and 90.</p>
          </div>
          <div className={fieldClass}>
            <Label htmlFor="event-longitude">Longitude</Label>
            <Input
              id="event-longitude"
              type="number"
              step="any"
              placeholder="e.g. 25.2798"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                clearFieldError("longitude");
              }}
              aria-invalid={fieldErrors.longitude ? "true" : "false"}
              aria-describedby={fieldErrors.longitude ? "event-longitude-error" : undefined}
            />
            <AdminFieldError id="event-longitude-error" message={fieldErrors.longitude} />
            <p className={hintClass}>Optional. Between −180 and 180.</p>
          </div>
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
            onChange={(e) => {
              setRegistrationUrl(e.target.value);
              clearFieldError("registration_url");
            }}
            maxLength={500}
            aria-invalid={fieldErrors.registration_url ? "true" : "false"}
            aria-describedby={fieldErrors.registration_url ? "event-registration-error" : undefined}
          />
          <AdminFieldError id="event-registration-error" message={fieldErrors.registration_url} />
          <p className={hintClass}>Optional. Must include http:// or https:// when provided.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="event-image">Image URL</Label>
          <Input
            id="event-image"
            type="url"
            placeholder="https://"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              clearFieldError("image_url");
            }}
            maxLength={1000}
            aria-invalid={fieldErrors.image_url ? "true" : "false"}
            aria-describedby={fieldErrors.image_url ? "event-image-error" : undefined}
          />
          <AdminFieldError id="event-image-error" message={fieldErrors.image_url} />
          <p className={hintClass}>Optional cover image (e.g. an Instagram post image). Must include http:// or https://.</p>
          {imageUrl && imageUrl.trim() ? (
            <div className="mt-[length:var(--space-3)]">
              <img
                src={imageUrl.trim()}
                alt="Event cover preview"
                className="max-h-48 rounded-lg border border-[var(--color-line)] object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                onLoad={(e) => {
                  e.currentTarget.style.display = "block";
                }}
              />
            </div>
          ) : null}
        </div>

        {submitError ? <Alert variant="error">{submitError}</Alert> : null}

        <Button type="submit" disabled={isSubmitting || !!loadError || isLoading}>
          {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save changes" : "Create event"}
        </Button>
      </form>
    </Card>
  );
}
