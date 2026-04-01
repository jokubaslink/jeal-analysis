import {
  clearOnboardingQuizAnswers,
  clearOnboardingSelections,
  readOnboardingQuizAnswers,
  readOnboardingSelections,
} from "./storage.js";
import { mergeQuizAndManualInterestIds } from "./quizEngine.js";

/**
 * Persists pending onboarding data (manual interest picks + quiz answers mapped to interests)
 * to the authenticated user. Call after login / registration flow.
 */
export async function syncPendingOnboardingToUser(userId, apiFetch) {
  const pendingSelections = readOnboardingSelections();
  const quizAnswers = readOnboardingQuizAnswers();

  if (pendingSelections.length === 0 && quizAnswers.length === 0) {
    return { synced: false, interestCount: 0 };
  }

  const [cats, ints] = await Promise.all([
    apiFetch("/interest-categories"),
    apiFetch("/interests"),
  ]);

  const mergedIds = mergeQuizAndManualInterestIds(
    quizAnswers,
    pendingSelections,
    Array.isArray(cats) ? cats : [],
    Array.isArray(ints) ? ints : []
  );

  if (mergedIds.length === 0) {
    return { synced: false, interestCount: 0 };
  }

  await apiFetch(`/users/${userId}/interests`, {
    method: "PUT",
    body: JSON.stringify({
      items: mergedIds.map((interestId) => ({
        interest_id: interestId,
        level: null,
      })),
    }),
  });

  clearOnboardingSelections();
  clearOnboardingQuizAnswers();

  return { synced: true, interestCount: mergedIds.length };
}
