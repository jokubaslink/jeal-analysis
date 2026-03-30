export const ONBOARDING_SELECTIONS_STORAGE_KEY =
  "jeal_onboarding_selected_interest_ids";

function isStoredInterestId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function readOnboardingSelections() {
  const raw = localStorage.getItem(ONBOARDING_SELECTIONS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(isStoredInterestId)
      : [];
  } catch {
    return [];
  }
}

export function writeOnboardingSelections(selectedIds) {
  localStorage.setItem(
    ONBOARDING_SELECTIONS_STORAGE_KEY,
    JSON.stringify(selectedIds)
  );
}

export function clearOnboardingSelections() {
  localStorage.removeItem(ONBOARDING_SELECTIONS_STORAGE_KEY);
}
