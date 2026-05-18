import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { mapApiValidationToFieldErrors, validateClubAdminForm } from "../../lib/adminFormValidation.js";
import { Alert, Button, Card, CardDescription, CardTitle, Input, Label, Select, Textarea } from "../../components/ui/index.js";
import AdminFieldError from "./AdminFieldError.jsx";

const fieldClass = "flex flex-col gap-[length:var(--space-2)]";
const hintClass = "m-0 text-[length:var(--font-size-caption)] text-[var(--color-ink-subtle)]";
const WEEKDAY_OPTIONS = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

export default function AdminClubForm() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!clubId;

  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [meetingWeekday, setMeetingWeekday] = useState("");
  const [meetingStartTime, setMeetingStartTime] = useState("");
  const [meetingEndTime, setMeetingEndTime] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setLoadError("");

    (async () => {
      try {
        const cats = await apiFetch("/interest-categories");
        if (ignore) return;
        setCategories(Array.isArray(cats) ? cats : []);

        if (isEditMode) {
          const club = await apiFetch(`/admin/clubs/${clubId}`);
          if (ignore) return;
          setName(club.name || "");
          setDescription(club.description || "");
          setCategoryId(club.category_id || "");
          setCity(club.city || "");
          setLocation(club.location || "");
          setLatitude(club.latitude != null ? String(club.latitude) : "");
          setLongitude(club.longitude != null ? String(club.longitude) : "");
          setWebsiteUrl(club.website_url || "");
          setImageUrl(club.image_url || "");
          setMeetingWeekday(
            club.meeting_weekday === null || club.meeting_weekday === undefined
              ? ""
              : String(club.meeting_weekday)
          );
          setMeetingStartTime(club.meeting_start_time || "");
          setMeetingEndTime(club.meeting_end_time || "");
          setIsActive(typeof club.is_active === "boolean" ? club.is_active : true);
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
  }, [clubId, isEditMode]);

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

    const { errors, trimmed } = validateClubAdminForm({
      name,
      description,
      city,
      location,
      latitude,
      longitude,
      websiteUrl,
      imageUrl,
      meetingWeekday,
      meetingStartTime,
      meetingEndTime,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError("Please fix the fields below before saving.");
      const first = document.querySelector("[aria-invalid='true']");
      first?.focus?.();
      return;
    }

    const body = {
      name: trimmed.name,
      description: trimmed.description,
      category_id: categoryId || null,
      city: trimmed.city,
      location: trimmed.location,
      latitude: trimmed.latitude,
      longitude: trimmed.longitude,
      website_url: trimmed.website_url,
      image_url: trimmed.image_url,
      meeting_weekday: trimmed.meeting_weekday,
      meeting_start_time: trimmed.meeting_start_time,
      meeting_end_time: trimmed.meeting_end_time,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await apiFetch(`/admin/clubs/${clubId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        navigate("/admin/clubs", { state: { flashMessage: "Club updated." } });
      } else {
        await apiFetch("/admin/clubs", {
          method: "POST",
          body: JSON.stringify(body),
        });
        navigate("/admin/clubs", { state: { flashMessage: "Club created." } });
      }
    } catch (err) {
      if (err.status === 422 && err.payload?.detail) {
        const mapped = mapApiValidationToFieldErrors(err.payload.detail);
        setFieldErrors(mapped);
        setSubmitError("The server could not save this club. Fix the highlighted fields.");
      } else {
        setSubmitError(err.message || (isEditMode ? "Could not update club." : "Could not create club."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle>{isEditMode ? "Edit club" : "Create club"}</CardTitle>
      <CardDescription>
        {isEditMode ? "Update club details and save changes." : "Create a new club. Only administrators can submit this form."}
      </CardDescription>

      <div className="mt-[length:var(--space-7)]">
        <Link to="/admin/clubs" className="text-sm text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]">
          ← Back to all clubs
        </Link>
      </div>

      {loadError ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="error">{loadError}</Alert>
        </div>
      ) : null}

      <form className="mt-[length:var(--space-10)] flex flex-col gap-[length:var(--space-7)]" onSubmit={handleSubmit} noValidate>
        <div className={fieldClass}>
          <Label htmlFor="club-name">
            Name <span className="text-[var(--color-error-text)]">*</span>
          </Label>
          <Input
            id="club-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
            maxLength={255}
            autoComplete="off"
            aria-invalid={fieldErrors.name ? "true" : "false"}
            aria-describedby={fieldErrors.name ? "club-name-error" : undefined}
          />
          <AdminFieldError id="club-name-error" message={fieldErrors.name} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-description">Description</Label>
          <Textarea
            id="club-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldError("description");
            }}
            maxLength={1000}
            rows={5}
            aria-invalid={fieldErrors.description ? "true" : "false"}
            aria-describedby={fieldErrors.description ? "club-description-error" : undefined}
          />
          <AdminFieldError id="club-description-error" message={fieldErrors.description} />
          <p className={hintClass}>Up to 1000 characters.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-category">Interest category</Label>
          <Select
            id="club-category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              clearFieldError("category_id");
            }}
            aria-invalid={fieldErrors.category_id ? "true" : "false"}
            aria-describedby={fieldErrors.category_id ? "club-category-error" : undefined}
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <AdminFieldError id="club-category-error" message={fieldErrors.category_id} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-city">City</Label>
          <Input
            id="club-city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              clearFieldError("city");
            }}
            maxLength={100}
            autoComplete="address-level2"
            aria-invalid={fieldErrors.city ? "true" : "false"}
            aria-describedby={fieldErrors.city ? "club-city-error" : undefined}
          />
          <AdminFieldError id="club-city-error" message={fieldErrors.city} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-location">Location / venue</Label>
          <Input
            id="club-location"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              clearFieldError("location");
            }}
            maxLength={255}
            aria-invalid={fieldErrors.location ? "true" : "false"}
            aria-describedby={fieldErrors.location ? "club-location-error" : undefined}
          />
          <AdminFieldError id="club-location-error" message={fieldErrors.location} />
        </div>

        <div className="grid grid-cols-2 gap-[length:var(--space-4)]">
          <div className={fieldClass}>
            <Label htmlFor="club-latitude">Latitude</Label>
            <Input
              id="club-latitude"
              type="number"
              step="any"
              placeholder="e.g. 54.6872"
              value={latitude}
              onChange={(e) => {
                setLatitude(e.target.value);
                clearFieldError("latitude");
              }}
              aria-invalid={fieldErrors.latitude ? "true" : "false"}
              aria-describedby={fieldErrors.latitude ? "club-latitude-error" : undefined}
            />
            <AdminFieldError id="club-latitude-error" message={fieldErrors.latitude} />
            <p className={hintClass}>Optional. Between −90 and 90.</p>
          </div>
          <div className={fieldClass}>
            <Label htmlFor="club-longitude">Longitude</Label>
            <Input
              id="club-longitude"
              type="number"
              step="any"
              placeholder="e.g. 25.2798"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                clearFieldError("longitude");
              }}
              aria-invalid={fieldErrors.longitude ? "true" : "false"}
              aria-describedby={fieldErrors.longitude ? "club-longitude-error" : undefined}
            />
            <AdminFieldError id="club-longitude-error" message={fieldErrors.longitude} />
            <p className={hintClass}>Optional. Between −180 and 180.</p>
          </div>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-website">Website URL</Label>
          <Input
            id="club-website"
            type="url"
            placeholder="https://"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value);
              clearFieldError("website_url");
            }}
            maxLength={500}
            aria-invalid={fieldErrors.website_url ? "true" : "false"}
            aria-describedby={fieldErrors.website_url ? "club-website-error" : undefined}
          />
          <AdminFieldError id="club-website-error" message={fieldErrors.website_url} />
          <p className={hintClass}>Optional. Must include http:// or https:// when provided.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-image-url">Image URL</Label>
          <Input
            id="club-image-url"
            type="url"
            placeholder="https://"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              clearFieldError("image_url");
            }}
            maxLength={1000}
            aria-invalid={fieldErrors.image_url ? "true" : "false"}
            aria-describedby={fieldErrors.image_url ? "club-image-url-error" : undefined}
          />
          <AdminFieldError id="club-image-url-error" message={fieldErrors.image_url} />
          <p className={hintClass}>Optional. Direct link to a cover image for this club. Must include http:// or https://.</p>
          {imageUrl && !fieldErrors.image_url ? (
            <img
              src={imageUrl}
              alt="Club image preview"
              className="mt-[length:var(--space-3)] h-32 w-full rounded-lg object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : null}
        </div>

        <div className="grid gap-[length:var(--space-5)] md:grid-cols-3">
          <div className={fieldClass}>
            <Label htmlFor="club-meeting-weekday">Recurring meeting day</Label>
            <Select
              id="club-meeting-weekday"
              value={meetingWeekday}
              onChange={(e) => {
                setMeetingWeekday(e.target.value);
                clearFieldError("meeting_weekday");
              }}
              aria-invalid={fieldErrors.meeting_weekday ? "true" : "false"}
              aria-describedby={fieldErrors.meeting_weekday ? "club-meeting-weekday-error" : undefined}
            >
              <option value="">— No recurring time —</option>
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <AdminFieldError id="club-meeting-weekday-error" message={fieldErrors.meeting_weekday} />
          </div>

          <div className={fieldClass}>
            <Label htmlFor="club-meeting-start">Start time</Label>
            <Input
              id="club-meeting-start"
              type="time"
              value={meetingStartTime}
              onChange={(e) => {
                setMeetingStartTime(e.target.value);
                clearFieldError("meeting_start_time");
              }}
              aria-invalid={fieldErrors.meeting_start_time ? "true" : "false"}
              aria-describedby={fieldErrors.meeting_start_time ? "club-meeting-start-error" : undefined}
            />
            <AdminFieldError id="club-meeting-start-error" message={fieldErrors.meeting_start_time} />
          </div>

          <div className={fieldClass}>
            <Label htmlFor="club-meeting-end">End time</Label>
            <Input
              id="club-meeting-end"
              type="time"
              value={meetingEndTime}
              onChange={(e) => {
                setMeetingEndTime(e.target.value);
                clearFieldError("meeting_end_time");
              }}
              aria-invalid={fieldErrors.meeting_end_time ? "true" : "false"}
              aria-describedby={fieldErrors.meeting_end_time ? "club-meeting-end-error" : undefined}
            />
            <AdminFieldError id="club-meeting-end-error" message={fieldErrors.meeting_end_time} />
            <p className={hintClass}>Shown in the user dashboard calendar as a recurring club activity.</p>
          </div>
        </div>

        <div className="flex items-center gap-[length:var(--space-4)]">
          <input
            id="club-active"
            type="checkbox"
            className="h-[18px] w-[18px] cursor-pointer accent-[var(--color-ink)]"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <Label htmlFor="club-active" className="mb-0 cursor-pointer font-semibold">
            Active (visible in listings)
          </Label>
        </div>

        {submitError ? <Alert variant="error">{submitError}</Alert> : null}

        <Button type="submit" disabled={isSubmitting || !!loadError || isLoading}>
          {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save changes" : "Create club"}
        </Button>
      </form>
    </Card>
  );
}
