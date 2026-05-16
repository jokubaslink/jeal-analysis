import {
  clearOnboardingQuizAnswers,
  clearOnboardingParticipationPreference,
  clearOnboardingSelections,
  readOnboardingParticipationPreference,
  readOnboardingSelections,
} from "./storage.js";

/**
 * Persists reviewed onboarding interests to the authenticated user.
 * Quiz answers are not converted here because users can remove suggested
 * interests during review, and those adjustments must remain authoritative.
 */
export async function syncPendingOnboardingToUser(userId, apiFetch) {
  const pendingSelections = readOnboardingSelections();

  if (pendingSelections.length === 0) {
    return { synced: false, interestCount: 0 };
  }

  const finalIds = [...new Set(pendingSelections)];

  await apiFetch(`/users/${userId}/interests`, {
    method: "PUT",
    body: JSON.stringify({
      items: finalIds.map((interestId) => ({
        interest_id: interestId,
        level: null,
      })),
    }),
  });

  await apiFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      participation_preference: readOnboardingParticipationPreference(),
    }),
  });

  clearOnboardingSelections();
  clearOnboardingQuizAnswers();
  clearOnboardingParticipationPreference();

  return { synced: true, interestCount: finalIds.length };
}
