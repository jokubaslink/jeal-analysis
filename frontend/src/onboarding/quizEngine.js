import { readOnboardingQuizAnswers } from "./storage.js";

/**
 * Each option carries two scoring dimensions:
 *   weights  – direct contribution to interest-category scores
 *   traits   – contribution to behavioural trait scores (social, competitive,
 *               commitment, digital) which later boost related categories as a
 *               secondary signal so that different answer patterns produce
 *               meaningfully different suggestions.
 */
export const ONBOARDING_QUIZ_QUESTIONS = [
  {
    id: "q_social_style",
    prompt: "What sounds most fun this week?",
    options: [
      { id: "q1_opt_team_event", label: "Joining a team challenge",       weights: { "Sports & Fitness": 3, "Social & Community": 1 },             traits: { social: 2, competitive: 1 } },
      { id: "q1_opt_creative",   label: "Creating art or music",          weights: { "Arts & Culture": 3 },                                        traits: { social: 1 } },
      { id: "q1_opt_building",   label: "Building or coding a project",   weights: { "STEM & Technology": 3, "Social & Community": 1 },            traits: { digital: 2, commitment: 1 } },
      { id: "q1_opt_chill",      label: "Relaxing with hobbies",          weights: { "Hobbies & Lifestyle": 3 },                                   traits: {} },
    ],
  },
  {
    id: "q_learning_goal",
    prompt: "Which goal matters most right now?",
    options: [
      { id: "q2_opt_leadership", label: "Leadership and networking",      weights: { "Social & Community": 4, "STEM & Technology": 1 },            traits: { social: 2, commitment: 2 } },
      { id: "q2_opt_health",     label: "Health and routine",             weights: { "Sports & Fitness": 3, "Hobbies & Lifestyle": 1 },            traits: { commitment: 2 } },
      { id: "q2_opt_showcase",   label: "Showcasing creative work",       weights: { "Arts & Culture": 3 },                                        traits: { social: 1 } },
      { id: "q2_opt_tech",       label: "Technical growth",               weights: { "STEM & Technology": 4 },                                     traits: { digital: 2, commitment: 2 } },
    ],
  },
  {
    id: "q_event_type",
    prompt: "What type of event would you likely attend?",
    options: [
      { id: "q3_opt_workshop",    label: "Workshop or seminar",           weights: { "STEM & Technology": 2, "Social & Community": 2 },            traits: { commitment: 1, digital: 1 } },
      { id: "q3_opt_performance", label: "Performance or exhibition",     weights: { "Arts & Culture": 3 },                                        traits: { social: 2 } },
      { id: "q3_opt_competition", label: "Match or competition",          weights: { "Sports & Fitness": 3 },                                      traits: { competitive: 3, social: 2 } },
      { id: "q3_opt_community",   label: "Volunteer or community meet",   weights: { "Social & Community": 3 },                                    traits: { social: 3, commitment: 1 } },
    ],
  },
  {
    id: "q_free_time",
    prompt: "How do you usually spend your free time?",
    options: [
      { id: "q4_opt_side_projects", label: "Side projects and tinkering", weights: { "STEM & Technology": 2, "Hobbies & Lifestyle": 1 },           traits: { digital: 2, commitment: 2 } },
      { id: "q4_opt_clubs",         label: "Clubs and campus socials",    weights: { "Social & Community": 2, "Hobbies & Lifestyle": 1 },          traits: { social: 3 } },
      { id: "q4_opt_art",           label: "Art, media, and storytelling",weights: { "Arts & Culture": 2 },                                        traits: { social: 1 } },
      { id: "q4_opt_active",        label: "Being active outdoors",       weights: { "Sports & Fitness": 2 },                                      traits: { competitive: 1, social: 1 } },
    ],
  },
  {
    id: "q_group_size",
    prompt: "Do you prefer solo activities or group ones?",
    options: [
      { id: "q5_opt_solo",       label: "Solo or in pairs",               weights: { "Hobbies & Lifestyle": 2, "STEM & Technology": 1 },           traits: { social: 1 } },
      { id: "q5_opt_small_group",label: "Small group (3–6 people)",       weights: { "Social & Community": 2, "Arts & Culture": 1 },               traits: { social: 2 } },
      { id: "q5_opt_big_team",   label: "Big team or crowd",              weights: { "Sports & Fitness": 2, "Social & Community": 2 },             traits: { social: 4, competitive: 1 } },
      { id: "q5_opt_no_pref",    label: "No preference either way",       weights: { "Hobbies & Lifestyle": 2 },                                   traits: { social: 2 } },
    ],
  },
  {
    id: "q_competition",
    prompt: "How competitive do you like things to be?",
    options: [
      { id: "q6_opt_casual",   label: "Purely casual — just for fun",     weights: { "Hobbies & Lifestyle": 3, "Arts & Culture": 1 },              traits: { competitive: 1 } },
      { id: "q6_opt_friendly", label: "Friendly competition is fine",     weights: { "Sports & Fitness": 2, "Social & Community": 2 },             traits: { competitive: 2, social: 1 } },
      { id: "q6_opt_serious",  label: "Serious — I like to win",          weights: { "Sports & Fitness": 3, "STEM & Technology": 1 },              traits: { competitive: 4 } },
      { id: "q6_opt_noncomp",  label: "Not competitive at all",           weights: { "Arts & Culture": 2, "Hobbies & Lifestyle": 2 },              traits: {} },
    ],
  },
  {
    id: "q_format",
    prompt: "Online or in-person — what works best for you?",
    options: [
      { id: "q7_opt_online",    label: "Online / virtual",                weights: { "STEM & Technology": 3, "Hobbies & Lifestyle": 1 },           traits: { digital: 4 } },
      { id: "q7_opt_in_person", label: "In-person only",                  weights: { "Social & Community": 3, "Sports & Fitness": 1 },             traits: { social: 2 } },
      { id: "q7_opt_hybrid",    label: "Hybrid — mix of both",            weights: { "STEM & Technology": 2, "Social & Community": 1 },            traits: { digital: 2, social: 1 } },
      { id: "q7_opt_flexible",  label: "Either works for me",             weights: { "Hobbies & Lifestyle": 2 },                                   traits: { digital: 1 } },
    ],
  },
  {
    id: "q_commitment",
    prompt: "How much time can you commit each week?",
    options: [
      { id: "q8_opt_drop_in",   label: "Drop-in when I can",              weights: { "Hobbies & Lifestyle": 3 },                                   traits: { commitment: 1 } },
      { id: "q8_opt_few_hours", label: "A few hours per week",            weights: { "Social & Community": 2, "Arts & Culture": 1 },               traits: { commitment: 2 } },
      { id: "q8_opt_regular",   label: "Regular weekly schedule",         weights: { "Sports & Fitness": 2, "STEM & Technology": 2 },              traits: { commitment: 3 } },
      { id: "q8_opt_deep_dive", label: "Deep dive — major commitment",    weights: { "STEM & Technology": 4 },                                     traits: { commitment: 4 } },
    ],
  },
];

/**
 * How many category-score points each unit of a trait adds to related
 * categories. Values tuned so that a strong trait signal (score ≈ 8–12)
 * adds roughly 2–5 points to a category — meaningful but not dominant.
 */
const TRAIT_CATEGORY_BOOSTS = {
  social:      { "Social & Community": 0.3, "Sports & Fitness": 0.2 },
  competitive: { "Sports & Fitness": 0.4, "STEM & Technology": 0.2 },
  commitment:  { "STEM & Technology": 0.4, "Social & Community": 0.2 },
  digital:     { "STEM & Technology": 0.4, "Hobbies & Lifestyle": 0.15 },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildOptionIndex(questions) {
  const optionIndex = new Map();
  questions.forEach((question) => {
    question.options.forEach((option) => {
      optionIndex.set(option.id, option);
    });
  });
  return optionIndex;
}

// ---------------------------------------------------------------------------
// Exported hydration helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Scoring – layer 1: direct category weights
// ---------------------------------------------------------------------------

/** Sum the `weights` of every chosen option into a Map<categoryName, score>. */
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

// ---------------------------------------------------------------------------
// Scoring – layer 2: behavioural trait scores + category boosts
// ---------------------------------------------------------------------------

/** Sum the `traits` of every chosen option into a Map<traitName, score>. */
export function scoreQuizTraits(answerOptionIds, questions = ONBOARDING_QUIZ_QUESTIONS) {
  const optionIndex = buildOptionIndex(questions);
  const traits = new Map();

  (answerOptionIds || []).forEach((optionId) => {
    const option = optionIndex.get(optionId);
    if (!option) return;

    Object.entries(option.traits || {}).forEach(([traitName, value]) => {
      const current = traits.get(traitName) || 0;
      traits.set(traitName, current + Number(value || 0));
    });
  });

  return traits;
}

/**
 * Apply trait-derived additive boosts on top of raw category scores.
 * Returns a new Map so the original is never mutated.
 */
export function applyTraitBoosts(categoryScores, traitScores) {
  const boosted = new Map(categoryScores);

  traitScores.forEach((traitScore, traitName) => {
    const boosts = TRAIT_CATEGORY_BOOSTS[traitName];
    if (!boosts || traitScore <= 0) return;

    Object.entries(boosts).forEach(([categoryName, boostPerPoint]) => {
      const current = boosted.get(categoryName) || 0;
      boosted.set(categoryName, current + traitScore * boostPerPoint);
    });
  });

  return boosted;
}

/**
 * Full two-layer scoring pipeline:
 *   raw category weights  +  trait-derived category boosts
 * This is the recommended entry-point for anything that needs category scores.
 */
export function computeBoostedCategoryScores(
  answerOptionIds,
  questions = ONBOARDING_QUIZ_QUESTIONS
) {
  const categoryScores = scoreQuizAnswers(answerOptionIds, questions);
  const traitScores = scoreQuizTraits(answerOptionIds, questions);
  return applyTraitBoosts(categoryScores, traitScores);
}

// ---------------------------------------------------------------------------
// Category ranking
// ---------------------------------------------------------------------------

export function rankCategories(categoryScores) {
  return Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([categoryName, score]) => ({ categoryName, score }));
}

// ---------------------------------------------------------------------------
// Interest suggestion – proportional slot allocation
// ---------------------------------------------------------------------------

/**
 * Map boosted category scores to suggested interest IDs.
 *
 * Improvements over the previous fixed-quota approach:
 *  - Considers up to `maxCategories` (default 5) instead of 3.
 *  - Allocates interest "slots" proportionally to each category's score so
 *    a strongly-scored category gets more suggestions than a weakly-scored one.
 *  - Minimum 1 slot per qualifying category to maintain breadth.
 *  - Higher `totalLimit` (12) surfaces more diverse results.
 */
export function suggestInterestIdsFromCategoryScores(
  categoryScores,
  categories,
  interests,
  {
    maxCategories = 5,
    totalLimit = 12,
  } = {}
) {
  const ranked = rankCategories(categoryScores)
    .filter((entry) => entry.score > 0)
    .slice(0, maxCategories);

  if (ranked.length === 0) {
    return [];
  }

  const categoryIdByName = new Map(
    (categories || []).map((category) => [category.name, category.id])
  );

  const rankedWithIds = ranked
    .map((entry) => ({
      ...entry,
      categoryId: categoryIdByName.get(entry.categoryName),
    }))
    .filter((entry) => entry.categoryId);

  if (rankedWithIds.length === 0) {
    return [];
  }

  const totalScore = rankedWithIds.reduce((sum, entry) => sum + entry.score, 0);

  const selectedIds = [];
  rankedWithIds.forEach(({ categoryId, score }) => {
    // Proportional quota: higher-scoring categories get more interest slots.
    const quota = Math.max(1, Math.round((score / totalScore) * totalLimit));
    const matches = (interests || [])
      .filter((interest) => interest.category_id === categoryId)
      .slice(0, quota)
      .map((interest) => interest.id);
    selectedIds.push(...matches);
  });

  return Array.from(new Set(selectedIds)).slice(0, totalLimit);
}

// ---------------------------------------------------------------------------
// Final merge
// ---------------------------------------------------------------------------

/**
 * Combine manually selected interest IDs with IDs inferred from quiz answers.
 * Uses the full two-layer scoring pipeline (weights + trait boosts).
 */
export function mergeQuizAndManualInterestIds(
  quizAnswerOptionIds,
  manualInterestIds,
  categories,
  interests
) {
  const boostedScores = computeBoostedCategoryScores(quizAnswerOptionIds);
  const fromQuiz = suggestInterestIdsFromCategoryScores(
    boostedScores,
    categories,
    interests
  );
  const normalizedManual = (manualInterestIds || []).filter(
    (id) => typeof id === "string" && String(id).trim().length > 0
  );
  return [...new Set([...normalizedManual, ...fromQuiz])];
}
