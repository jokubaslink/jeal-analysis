import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle, Input, Label, Select, Textarea } from "../../components/ui/index.js";

const fieldClass = "flex flex-col gap-[length:var(--space-2)]";
const hintClass = "m-0 text-[length:var(--font-size-caption)] text-[var(--color-ink-subtle)]";
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
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [submitError, setSubmitError] = useState("");
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
          setWebsiteUrl(club.website_url || "");
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

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

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
      setSubmitError(err.message || (isEditMode ? "Could not update club." : "Could not create club."));
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

      <form className="mt-[length:var(--space-10)] flex flex-col gap-[length:var(--space-7)]" onSubmit={handleSubmit}>
        <div className={fieldClass}>
          <Label htmlFor="club-name">
            Name <span className="text-[var(--color-error-text)]">*</span>
          </Label>
          <Input
            id="club-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            required
            autoComplete="off"
          />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-description">Description</Label>
          <Textarea
            id="club-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={5}
          />
          <p className={hintClass}>Up to 1000 characters.</p>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-category">Interest category</Label>
          <Select id="club-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-city">City</Label>
          <Input
            id="club-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            autoComplete="address-level2"
          />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-location">Location / venue</Label>
          <Input id="club-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={255} />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="club-website">Website URL</Label>
          <Input
            id="club-website"
            type="url"
            placeholder="https://"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            maxLength={500}
          />
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
