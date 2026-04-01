import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle, Input, Label, Select, Textarea } from "../../components/ui/index.js";

const fieldClass = "flex flex-col gap-[length:var(--space-2)]";
const hintClass = "m-0 text-[length:var(--font-size-caption)] text-[var(--color-ink-subtle)]";
const formMax = "max-w-[520px]";

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
    <Card className={formMax}>
      <CardTitle>Clubs management</CardTitle>
      <CardDescription>Create a new club. Only administrators can submit this form.</CardDescription>

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
        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <Button type="submit" disabled={isSubmitting || !!loadError}>
          {isSubmitting ? "Creating…" : "Create club"}
        </Button>
      </form>
    </Card>
  );
}
