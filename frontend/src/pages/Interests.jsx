import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { apiFetch } from "../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle, EmptyState, Skeleton } from "../components/ui/index.js";
import { INTERESTS_EMPTY_FOR_RECOMMENDATIONS } from "../lib/emptyStateMessages.js";

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const requests = [apiFetch("/interest-categories"), apiFetch("/interests")];
      if (userId) requests.push(apiFetch(`/users/${userId}/interests`));

      const [cats, ints, userInts] = await Promise.all(requests);
      setCategories(Array.isArray(cats) ? cats : []);
      setInterests(Array.isArray(ints) ? ints : []);

      if (userId && Array.isArray(userInts)) {
        setSelectedIds(new Set(userInts.map((i) => i.interest_id)));
      }
    } catch (e) {
      setError(e.message || "Failed to load interests.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleInterest = (id) => {
    setSaveSuccessMessage("");
    setSaveErrorMessage("");
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      items: Array.from(selectedIds).map((id) => ({ interest_id: id, level: null })),
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
      setSaveErrorMessage(e.detail ?? e.message ?? "Failed to save interests.");
    } finally {
      setIsSaving(false);
    }
  };

  const anySelected = selectedIds.size > 0;

  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-max-width)] flex-col gap-[length:var(--space-11)]">
      <header className="flex flex-col gap-[length:var(--space-7)] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[length:var(--space-2)]">
          <p className="m-0 text-[length:var(--font-size-caption)] font-bold uppercase tracking-[var(--letter-spacing-ui)] text-[var(--color-brand-green)]">
            Profile setup
          </p>
          <h1 className="m-0 text-[length:var(--font-size-display)] font-bold text-[var(--color-ink)]">
            Select your interests
          </h1>
          <p className="m-0 max-w-[680px] text-[length:var(--font-size-body)] text-[var(--color-ink-muted)]">
            Choose topics you like. We will use them to personalize clubs, events, and recommendations.
          </p>
        </div>

        <div className="flex flex-col gap-[length:var(--space-4)] md:items-end">
          <div className="inline-flex w-fit items-center gap-[length:var(--space-3)] rounded-[var(--radius-pill)] border border-[var(--color-border-medium)] bg-[rgba(17,24,39,0.06)] px-[length:var(--space-5)] py-[length:var(--space-3)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-brand-green)]" />
            <span className="text-[length:var(--font-size-small)] font-bold text-[var(--color-ink)]">
              {selectedIds.size} interest{selectedIds.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <Button onClick={handleSave} disabled={isSaving || !userId || !anySelected}>
            {isSaving ? "Saving..." : "Save interests"}
          </Button>
        </div>
      </header>

      {saveSuccessMessage ? <Alert variant="success">{saveSuccessMessage}</Alert> : null}
      {saveErrorMessage ? <Alert variant="error">{saveErrorMessage}</Alert> : null}
      {userId && !isLoading && !anySelected ? (
        <EmptyState
          align="left"
          title="No interests selected yet"
          description={INTERESTS_EMPTY_FOR_RECOMMENDATIONS}
        />
      ) : null}

      <Card className="p-[length:var(--space-10)]">
        <CardTitle as="h2">Interest categories</CardTitle>
        <CardDescription>
          Browse by category and tap cards to toggle selection.
        </CardDescription>

        {isLoading ? (
          <div className="mt-[length:var(--space-10)] grid grid-cols-1 gap-[length:var(--space-7)] md:grid-cols-2">
            {[0, 1, 2, 3].map((idx) => (
              <Skeleton
                key={idx}
                className="h-[140px] rounded-[var(--radius-lg)] border border-[var(--color-border)]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-[length:var(--space-10)] flex flex-col items-start gap-[length:var(--space-5)]">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={loadData}>
              Retry
            </Button>
          </div>
        ) : categories.length === 0 ? (
          <div className="mt-[length:var(--space-10)]">
            <EmptyState
              align="left"
              title="No interest categories available"
              description="Add categories in admin settings to populate this selection step."
            />
          </div>
        ) : (
          <div className="mt-[length:var(--space-10)] grid grid-cols-1 gap-[length:var(--space-8)] xl:grid-cols-2">
            {categories.map((category) => {
              const items = interests.filter((i) => i.category_id === category.id);
              if (items.length === 0) return null;

              return (
                <section
                  key={category.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[length:var(--space-8)]"
                >
                  <div className="mb-[length:var(--space-6)]">
                    <h3 className="m-0 text-[length:var(--font-size-h3)] font-bold text-[var(--color-ink)]">
                      {category.name}
                    </h3>
                    {category.description ? (
                      <p className="mt-[length:var(--space-2)] text-[length:var(--font-size-body)] text-[var(--color-ink-muted)]">
                        {category.description}
                      </p>
                    ) : null}
                  </div>

                  <ul className="grid list-none grid-cols-1 gap-[length:var(--space-5)] p-0 sm:grid-cols-2">
                    {items.map((interest) => {
                      const checked = selectedIds.has(interest.id);
                      return (
                        <li key={interest.id}>
                          <button
                            type="button"
                            onClick={() => handleToggleInterest(interest.id)}
                            aria-label={`${checked ? "Remove" : "Add"} interest ${interest.name}`}
                            aria-pressed={checked}
                            className={[
                              "h-full w-full rounded-[var(--radius-lg)] border p-[length:var(--space-6)] text-left",
                              "transition-[transform,box-shadow,background-color,border-color] duration-[var(--duration-normal)] [transition-timing-function:var(--ease-out)]",
                              "motion-reduce:transition-none motion-reduce:active:scale-100",
                              "active:scale-[0.99] hover:-translate-y-px motion-reduce:hover:translate-y-0",
                              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-green)]",
                              checked
                                ? "border-[var(--color-brand-green)] bg-[linear-gradient(135deg,rgba(190,242,100,0.26),rgba(187,247,208,0.38))] shadow-[0_14px_30px_rgba(15,23,42,0.09)]"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-medium)] hover:bg-[rgba(17,24,39,0.02)] hover:shadow-[var(--shadow-card)]",
                            ].join(" ")}
                          >
                            <div className="mb-[length:var(--space-4)] flex items-start justify-between gap-[length:var(--space-3)]">
                              <span className="text-[length:var(--font-size-body)] font-bold text-[var(--color-ink)]">
                                {interest.name}
                              </span>
                              <span
                                className={[
                                  "mt-[2px] inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                                  checked
                                    ? "border-[var(--color-brand-green)] bg-[var(--color-brand-green)]"
                                    : "border-[var(--color-border-medium)] bg-transparent",
                                ].join(" ")}
                              >
                                {checked ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                              </span>
                            </div>
                            <p className="m-0 text-[length:var(--font-size-small)] leading-[var(--line-height-relaxed)] text-[var(--color-ink-muted)]">
                              {interest.description || "Select to use this topic in your recommendations."}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

