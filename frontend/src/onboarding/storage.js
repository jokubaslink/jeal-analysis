export const ONBOARDING_SELECTIONS_STORAGE_KEY =
  "jeal_onboarding_selected_interest_ids";
/** Persists quiz option IDs across register/login redirects (same origin, pre-auth). */
export const ONBOARDING_QUIZ_ANSWERS_STORAGE_KEY =
  "jeal_onboarding_quiz_answer_option_ids";
export const ONBOARDING_PARTICIPATION_PREFERENCE_STORAGE_KEY =
  "jeal_onboarding_participation_preference";

const PARTICIPATION_PREFERENCES = new Set(["clubs", "events", "both"]);

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

function isStoredOptionId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function readOnboardingQuizAnswers() {
  const raw = localStorage.getItem(ONBOARDING_QUIZ_ANSWERS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredOptionId) : [];
  } catch {
    return [];
  }
}

export function writeOnboardingQuizAnswers(optionIds) {
  localStorage.setItem(
    ONBOARDING_QUIZ_ANSWERS_STORAGE_KEY,
    JSON.stringify(optionIds)
  );
}

export function clearOnboardingQuizAnswers() {
  localStorage.removeItem(ONBOARDING_QUIZ_ANSWERS_STORAGE_KEY);
}

export function readOnboardingParticipationPreference() {
  const raw = localStorage.getItem(ONBOARDING_PARTICIPATION_PREFERENCE_STORAGE_KEY);
  return PARTICIPATION_PREFERENCES.has(raw) ? raw : "both";
}

export function writeOnboardingParticipationPreference(preference) {
  const normalized = PARTICIPATION_PREFERENCES.has(preference) ? preference : "both";
  localStorage.setItem(ONBOARDING_PARTICIPATION_PREFERENCE_STORAGE_KEY, normalized);
}

export function clearOnboardingParticipationPreference() {
  localStorage.removeItem(ONBOARDING_PARTICIPATION_PREFERENCE_STORAGE_KEY);
}
