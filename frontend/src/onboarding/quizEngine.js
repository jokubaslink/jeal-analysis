import { readOnboardingQuizAnswers } from "./storage.js";

export const ONBOARDING_QUIZ_QUESTIONS = [
  {
    id: "q_social_style",
    prompt: "What sounds most fun this week?",
    options: [
      { id: "q1_opt_team_event", label: "Joining a team challenge", weights: { "Sports & Fitness": 3, "Campus & Community": 1 } },
      { id: "q1_opt_creative", label: "Creating art or music", weights: { "Arts & Culture": 3 } },
      { id: "q1_opt_building", label: "Building or coding a project", weights: { "Technology & Innovation": 3, "Academic & Career": 1 } },
      { id: "q1_opt_chill", label: "Relaxing with hobbies", weights: { "Hobbies & Lifestyle": 3 } },
    ],
  },
  {
    id: "q_learning_goal",
    prompt: "Which goal matters most right now?",
    options: [
      { id: "q2_opt_leadership", label: "Leadership and networking", weights: { "Academic & Career": 3, "Campus & Community": 2 } },
      { id: "q2_opt_health", label: "Health and routine", weights: { "Sports & Fitness": 3, "Hobbies & Lifestyle": 1 } },
      { id: "q2_opt_showcase", label: "Showcasing creative work", weights: { "Arts & Culture": 3 } },
      { id: "q2_opt_tech", label: "Technical growth", weights: { "Technology & Innovation": 3, "Academic & Career": 1 } },
    ],
  },
  {
    id: "q_event_type",
    prompt: "What type of event would you likely attend?",
    options: [
      { id: "q3_opt_workshop", label: "Workshop or seminar", weights: { "Academic & Career": 2, "Technology & Innovation": 2 } },
      { id: "q3_opt_performance", label: "Performance or exhibition", weights: { "Arts & Culture": 3 } },
      { id: "q3_opt_competition", label: "Match or competition", weights: { "Sports & Fitness": 3 } },
      { id: "q3_opt_community", label: "Volunteer or community meet", weights: { "Campus & Community": 3 } },
    ],
  },
  {
    id: "q_free_time",
    prompt: "How do you usually spend your free time?",
    options: [
      { id: "q4_opt_side_projects", label: "Side projects and tinkering", weights: { "Technology & Innovation": 2, "Hobbies & Lifestyle": 1 } },
      { id: "q4_opt_clubs", label: "Clubs and campus socials", weights: { "Campus & Community": 2, "Hobbies & Lifestyle": 1 } },
      { id: "q4_opt_art", label: "Art, media, and storytelling", weights: { "Arts & Culture": 2 } },
      { id: "q4_opt_active", label: "Being active outdoors", weights: { "Sports & Fitness": 2 } },
    ],
  },
];

/** Map stored option IDs back to { [questionId]: optionId } for React state. */
export function buildQuizAnswersMapFromOptionIds(savedOptionIds) {
  const answerMap = {};
  ONBOARDING_QUIZ_QUESTIONS.forEach((question) => {
    const selectedOptionId = question.options.find((option) =>
      savedOptionIds.includes(option.id)
    )?.id;
    if (selectedOptionId) {
      answerMap[question.id] = selectedOptionId;
    }
  });
  return answerMap;
}

/** Load quiz answers from localStorage synchronously (safe before auth / first paint). */
export function hydrateQuizAnswersFromStorage() {
  return buildQuizAnswersMapFromOptionIds(readOnboardingQuizAnswers());
}

function buildOptionIndex(questions) {
  const optionIndex = new Map();
  questions.forEach((question) => {
    question.options.forEach((option) => {
      optionIndex.set(option.id, option);
    });
  });
  return optionIndex;
}

export function scoreQuizAnswers(answerOptionIds, questions = ONBOARDING_QUIZ_QUESTIONS) {
  const optionIndex = buildOptionIndex(questions);
  const scores = new Map();

  (answerOptionIds || []).forEach((optionId) => {
    const option = optionIndex.get(optionId);
    if (!option) return;

    Object.entries(option.weights || {}).forEach(([categoryName, weight]) => {
      const current = scores.get(categoryName) || 0;
      scores.set(categoryName, current + Number(weight || 0));
    });
  });

  return scores;
}

export function rankCategories(categoryScores) {
  return Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([categoryName, score]) => ({ categoryName, score }));
}

export function suggestInterestIdsFromCategoryScores(
  categoryScores,
  categories,
  interests,
  {
    maxCategories = 3,
    maxInterestsPerCategory = 3,
    totalLimit = 9,
  } = {}
) {
  const ranked = rankCategories(categoryScores).slice(0, maxCategories);
  if (ranked.length === 0) {
    return [];
  }

  const categoryIdByName = new Map(
    (categories || []).map((category) => [category.name, category.id])
  );

  const rankedCategoryIds = ranked
    .map((entry) => categoryIdByName.get(entry.categoryName))
    .filter(Boolean);

  const selectedIds = [];
  rankedCategoryIds.forEach((categoryId) => {
    const matches = (interests || [])
      .filter((interest) => interest.category_id === categoryId)
      .slice(0, maxInterestsPerCategory)
      .map((interest) => interest.id);
    selectedIds.push(...matches);
  });

  return Array.from(new Set(selectedIds)).slice(0, totalLimit);
}

/**
 * Combine manually selected interest IDs with IDs inferred from quiz answers (category scores).
 */
export function mergeQuizAndManualInterestIds(
  quizAnswerOptionIds,
  manualInterestIds,
  categories,
  interests
) {
  const scores = scoreQuizAnswers(quizAnswerOptionIds);
  const fromQuiz = suggestInterestIdsFromCategoryScores(
    scores,
    categories,
    interests
  );
  const normalizedManual = (manualInterestIds || []).filter(
    (id) => typeof id === "string" && String(id).trim().length > 0
  );
  return [...new Set([...normalizedManual, ...fromQuiz])];
}
