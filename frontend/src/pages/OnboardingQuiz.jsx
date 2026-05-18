import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  clearOnboardingSelections,
  clearOnboardingQuizAnswers,
  clearOnboardingParticipationPreference,
  readOnboardingParticipationPreference,
  readOnboardingSelections,
  writeOnboardingParticipationPreference,
  writeOnboardingQuizAnswers,
  writeOnboardingSelections,
} from "../onboarding/storage.js";
import {
  ONBOARDING_QUIZ_QUESTIONS,
  hydrateQuizAnswersFromStorage,
  computeBoostedCategoryScores,
  getParticipationPreferenceFromAnswers,
  suggestInterestIdsFromCategoryScores,
} from "../onboarding/quizEngine.js";
import { Alert, EmptyState, Skeleton } from "../components/ui/index.js";

export default function OnboardingQuiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed, userId, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [interests, setInterests] = useState([]);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(readOnboardingSelections())
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [interestToAddId, setInterestToAddId] = useState("");
  const [participationPreference, setParticipationPreference] = useState(() =>
    readOnboardingParticipationPreference()
  );
  const [hasLoadedSavedSelections, setHasLoadedSavedSelections] = useState(false);
  const [quizAnswersByQuestionId, setQuizAnswersByQuestionId] = useState(() =>
    hydrateQuizAnswersFromStorage()
  );
  const [quizPhase, setQuizPhase] = useState(() => {
    const saved = hydrateQuizAnswersFromStorage();
    return Object.keys(saved).length >= ONBOARDING_QUIZ_QUESTIONS.length
      ? "review"
      : "quiz";
  });
  const [quizQuestionStep, setQuizQuestionStep] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const returnTo = location.state?.from || "/results";

  useEffect(() => {
    let ignore = false;

    const loadQuizData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [cats, ints] = await Promise.all([
          apiFetch("/interest-categories"),
          apiFetch("/interests"),
        ]);

        if (ignore) {
          return;
        }

        setCategories(Array.isArray(cats) ? cats : []);
        setInterests(Array.isArray(ints) ? ints : []);
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || "Failed to load onboarding quiz.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadQuizData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setSelectedIds(new Set(readOnboardingSelections()));
      setHasLoadedSavedSelections(true);
      return;
    }

    let ignore = false;

    const loadUserSelections = async () => {
      setSaveError("");

      try {
        const userSelections = await apiFetch(`/users/${userId}/interests`);
        if (ignore) {
          return;
        }

        const ids = Array.isArray(userSelections)
          ? userSelections
              .map((selection) => selection.interest_id)
              .filter((value) => typeof value === "string" && value.trim().length > 0)
          : [];

        const pendingIds = readOnboardingSelections();
        setSelectedIds(new Set(pendingIds.length > 0 ? pendingIds : ids));
      } catch (loadError) {
        if (!ignore) {
          setSaveError(loadError.message || "Failed to load your saved interests.");
        }
      } finally {
        if (!ignore) {
          setHasLoadedSavedSelections(true);
        }
      }
    };

    loadUserSelections();

    return () => {
      ignore = true;
    };
  }, [userId]);

  useEffect(() => {
    writeOnboardingSelections(Array.from(selectedIds));
  }, [selectedIds]);

  useEffect(() => {
    writeOnboardingQuizAnswers(Object.values(quizAnswersByQuestionId));
  }, [quizAnswersByQuestionId]);

  useEffect(() => {
    writeOnboardingParticipationPreference(participationPreference);
  }, [participationPreference]);

  const steps = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          items: interests.filter((interest) => interest.category_id === category.id),
        }))
        .filter((category) => category.items.length > 0),
    [categories, interests]
  );

  useEffect(() => {
    if (steps.length === 0) {
      setCurrentStep(0);
      return;
    }

    setCurrentStep((previousStep) =>
      previousStep >= steps.length ? steps.length - 1 : previousStep
    );
  }, [steps]);

  const currentCategory = steps[currentStep] ?? null;
  const totalSteps = steps.length;
  const isLastStep = totalSteps > 0 && currentStep === totalSteps - 1;
  const hasAnySelection = selectedIds.size > 0;
  const answeredOptionIds = Object.values(quizAnswersByQuestionId);
  const quizCategoryScores = useMemo(
    () => computeBoostedCategoryScores(answeredOptionIds),
    [answeredOptionIds]
  );
  const suggestedInterestIds = useMemo(
    () =>
      suggestInterestIdsFromCategoryScores(
        quizCategoryScores,
        categories,
        interests
      ),
    [categories, interests, quizCategoryScores]
  );
  const selectedInterests = useMemo(
    () => interests.filter((interest) => selectedIds.has(interest.id)),
    [interests, selectedIds]
  );
  const interestsAvailableToAdd = useMemo(
    () => interests.filter((interest) => !selectedIds.has(interest.id)),
    [interests, selectedIds]
  );

  useEffect(() => {
    if (
      quizPhase !== "review" ||
      isLoading ||
      selectedIds.size > 0 ||
      suggestedInterestIds.length === 0
    ) {
      return;
    }

    setSelectedIds(new Set(suggestedInterestIds));
  }, [isLoading, quizPhase, selectedIds.size, suggestedInterestIds]);

  const handleToggleInterest = (interestId) => {
    setSaveMessage("");
    setSaveError("");

    setSelectedIds((previousSelectedIds) => {
      const nextSelectedIds = new Set(previousSelectedIds);
      if (nextSelectedIds.has(interestId)) {
        nextSelectedIds.delete(interestId);
      } else {
        nextSelectedIds.add(interestId);
      }
      return nextSelectedIds;
    });
  };

  const handleBack = () => {
    setSaveMessage("");
    setSaveError("");
    setCurrentStep((previousStep) => Math.max(previousStep - 1, 0));
  };

  const handleNext = () => {
    setSaveMessage("");
    setSaveError("");
    setCurrentStep((previousStep) => Math.min(previousStep + 1, totalSteps - 1));
  };

  const handleSelectAndAdvance = (questionId, optionId) => {
    if (isAdvancing) return;
    setSaveMessage("");
    setSaveError("");
    setIsAdvancing(true);

    const updatedAnswers = { ...quizAnswersByQuestionId, [questionId]: optionId };
    const updatedAnswerIds = Object.values(updatedAnswers);
    setQuizAnswersByQuestionId(updatedAnswers);
    writeOnboardingQuizAnswers(updatedAnswerIds);
    setParticipationPreference(getParticipationPreferenceFromAnswers(updatedAnswerIds));

    const isLastQuestion = quizQuestionStep === ONBOARDING_QUIZ_QUESTIONS.length - 1;

    window.setTimeout(() => {
      setIsAdvancing(false);
      if (!isLastQuestion) {
        setQuizQuestionStep((q) => q + 1);
      } else {
        const boosted = computeBoostedCategoryScores(updatedAnswerIds);
        const suggested = suggestInterestIdsFromCategoryScores(boosted, categories, interests);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          suggested.forEach((id) => next.add(id));
          return next;
        });
        setQuizPhase("review");
      }
    }, 280);
  };

  const handleAddInterest = () => {
    if (!interestToAddId) {
      return;
    }

    setSaveMessage("");
    setSaveError("");
    setSelectedIds((previousSelectedIds) => {
      const nextSelectedIds = new Set(previousSelectedIds);
      nextSelectedIds.add(interestToAddId);
      return nextSelectedIds;
    });
    setInterestToAddId("");
  };

  const saveSelections = useCallback(async () => {
    if (!userId || !hasAnySelection) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      await apiFetch(`/users/${userId}/interests`, {
        method: "PUT",
        body: JSON.stringify({
          items: Array.from(selectedIds).map((interestId) => ({
            interest_id: interestId,
            level: null,
          })),
        }),
      });

      await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          participation_preference: participationPreference,
        }),
      });

      clearOnboardingSelections();
      clearOnboardingQuizAnswers();
      clearOnboardingParticipationPreference();
      setSaveMessage("Your interests are saved. Redirecting to your results...");
      window.setTimeout(() => navigate(returnTo, { replace: true }), 900);
    } catch (saveSelectionsError) {
      if (saveSelectionsError.status === 401 || saveSelectionsError.status === 403) {
        setSaveError("Please log in again to save your onboarding answers.");
        logout();
        navigate("/login", {
          replace: true,
          state: { from: returnTo },
        });
        return;
      }

      setSaveError(saveSelectionsError.message || "Failed to save your interests.");
    } finally {
      setIsSaving(false);
    }
  }, [hasAnySelection, logout, navigate, participationPreference, returnTo, selectedIds, userId]);

  const handleFinish = async () => {
    if (!hasAnySelection) {
      setSaveError("Choose at least one interest before finishing.");
      return;
    }

    if (!isAuthed) {
      setSaveMessage("Your answers are saved on this device. Sign in to keep going.");
      return;
    }

    await saveSelections();
  };

  if (isLoading || !hasLoadedSavedSelections) {
    return (
      <div style={page}>
        <section style={quizPhaseShell}>
          <div style={quizPhaseCard}>
            <Skeleton style={skeletonBar} />
            <Skeleton style={skeletonTitle} />
            <Skeleton style={skeletonText} />
            <div style={skeletonGrid}>
              <Skeleton style={skeletonOption} />
              <Skeleton style={skeletonOption} />
              <Skeleton style={skeletonOption} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div style={page}>
        <section style={quizPhaseShell}>
          <div style={quizPhaseCard}>
            <p style={eyebrow}>Onboarding quiz</p>
            <h2 style={{ margin: "12px 0 0 0", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              We could not load the quiz
            </h2>
            <Alert variant="error" className="mt-[length:var(--space-6)]">
              {error}
            </Alert>
            <button type="button" style={{ ...primaryButton, marginTop: "16px" }} onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div style={page}>
        <section style={quizPhaseShell}>
          <div style={quizPhaseCard}>
            <p style={eyebrow}>Onboarding quiz</p>
            <EmptyState
              align="left"
              title="No quiz steps are available yet"
              description="Add interest categories and interests to populate the onboarding flow."
            />
          </div>
        </section>
      </div>
    );
  }

  if (quizPhase === "quiz") {
    const totalQuestions = ONBOARDING_QUIZ_QUESTIONS.length;
    const currentQuestion = ONBOARDING_QUIZ_QUESTIONS[quizQuestionStep];
    const currentAnswer = quizAnswersByQuestionId[currentQuestion.id];

    return (
      <div style={page}>
        <section style={quizPhaseShell}>
          <div style={quizPhaseCard}>
            <div style={quizPhaseTop}>
              <p style={eyebrow}>Personalize your JEAL experience</p>
              <button
                type="button"
                onClick={() => setQuizPhase("interests")}
                style={ghostButton}
              >
                Skip
              </button>
            </div>

            <div style={quizDots}>
              {ONBOARDING_QUIZ_QUESTIONS.map((q, i) => (
                <div
                  key={q.id}
                  style={{
                    ...quizDot,
                    width: i === quizQuestionStep ? 22 : 8,
                    backgroundColor:
                      i < quizQuestionStep
                        ? "#113c2d"
                        : i === quizQuestionStep
                        ? "#84cc16"
                        : "rgba(17,24,39,0.15)",
                  }}
                />
              ))}
            </div>

            <p style={quizStepLabel}>Question {quizQuestionStep + 1} of {totalQuestions}</p>
            <h2 style={quizQuestionHeading}>{currentQuestion.prompt}</h2>

            <div style={quizOptionsList}>
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswer === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isAdvancing}
                    onClick={() => handleSelectAndAdvance(currentQuestion.id, option.id)}
                    aria-pressed={isSelected}
                    style={{
                      ...quizOptionRow,
                      borderColor: isSelected ? "#113c2d" : "rgba(17,24,39,0.1)",
                      background: isSelected
                        ? "linear-gradient(135deg, #d9f99d 0%, #bbf7d0 100%)"
                        : "white",
                      opacity: isAdvancing && !isSelected ? 0.55 : 1,
                    }}
                  >
                    <span style={quizOptionRowText}>{option.label}</span>
                    <span
                      style={{
                        ...quizOptionRowCheck,
                        opacity: isSelected ? 1 : 0,
                      }}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={quizPhaseFooter}>
              {quizQuestionStep > 0 ? (
                <button
                  type="button"
                  onClick={() => setQuizQuestionStep((q) => q - 1)}
                  style={ghostButton}
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setQuizPhase("interests")}
                style={ghostButton}
              >
                Skip quiz
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (quizPhase === "review") {
    return (
      <div style={page}>
        <section style={quizPhaseShell}>
          <div style={{ ...quizPhaseCard, maxWidth: "640px" }}>
            <div style={quizPhaseTop}>
              <p style={eyebrow}>Review your interests</p>
              <div style={statusPill}>{selectedIds.size} picked</div>
            </div>

            <p style={quizStepLabel}>Final step</p>
            <h2 style={quizQuestionHeading}>Adjust your quiz suggestions</h2>
            <p style={interestSubtitle}>
              Remove anything that does not fit, or add another interest before saving.
            </p>

            {selectedInterests.length > 0 ? (
              <div style={reviewInterestGrid}>
                {selectedInterests.map((interest) => (
                  <div key={interest.id} style={reviewInterestChip}>
                    <span style={reviewInterestName}>{interest.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleInterest(interest.id)}
                      aria-label={`Remove ${interest.name}`}
                      style={removeInterestButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={emptyReviewState}>
                No interests selected yet. Add at least one interest to finish.
              </div>
            )}

            <div style={manualAddRow}>
              <select
                value={interestToAddId}
                onChange={(event) => setInterestToAddId(event.target.value)}
                style={manualAddSelect}
                aria-label="Interest to add"
              >
                <option value="">Choose an interest to add</option>
                {interestsAvailableToAdd.map((interest) => (
                  <option key={interest.id} value={interest.id}>
                    {interest.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddInterest}
                disabled={!interestToAddId}
                style={{
                  ...primaryButton,
                  opacity: interestToAddId ? 1 : 0.62,
                  cursor: interestToAddId ? "pointer" : "default",
                }}
              >
                Add
              </button>
            </div>

            {saveError ? <Alert variant="error" className="mt-[length:var(--space-8)]">{saveError}</Alert> : null}
            {saveMessage ? <Alert variant="success" className="mt-[length:var(--space-8)]">{saveMessage}</Alert> : null}

            <div style={quizPhaseFooter}>
              <button
                type="button"
                onClick={() => {
                  setQuizQuestionStep(ONBOARDING_QUIZ_QUESTIONS.length - 1);
                  setQuizPhase("quiz");
                }}
                style={ghostButton}
              >
                ← Back
              </button>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setQuizPhase("interests")}
                  style={ghostButton}
                >
                  Browse all
                </button>
                {!isAuthed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate("/login", { state: { from: returnTo } })}
                      style={ghostButton}
                    >
                      Log in to save
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/register", { state: { from: returnTo } })}
                      style={primaryButton}
                    >
                      Create account
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    style={{
                      ...primaryButton,
                      opacity: isSaving || !hasAnySelection ? 0.72 : 1,
                      cursor: isSaving || !hasAnySelection ? "default" : "pointer",
                    }}
                    disabled={isSaving || !hasAnySelection}
                  >
                    {isSaving ? "Saving..." : "Save interests"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={page}>
      <section style={quizPhaseShell}>
        <div style={{ ...quizPhaseCard, maxWidth: "580px" }}>
          <div style={quizPhaseTop}>
            <p style={eyebrow}>Personalize your JEAL experience</p>
            <div style={statusPill}>{selectedIds.size} picked</div>
          </div>

          <div style={quizDots}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  ...quizDot,
                  width: i === currentStep ? 22 : 8,
                  backgroundColor:
                    i < currentStep
                      ? "#113c2d"
                      : i === currentStep
                      ? "#84cc16"
                      : "rgba(17,24,39,0.15)",
                }}
              />
            ))}
          </div>

          <p style={quizStepLabel}>
            Category {currentStep + 1} of {totalSteps}
          </p>
          <h2 style={quizQuestionHeading}>{currentCategory.name}</h2>
          <p style={interestSubtitle}>
            {currentCategory.description || "Select all that interest you."}
          </p>

          <div style={quizOptionsList}>
            {currentCategory.items.map((interest) => {
              const isSelected = selectedIds.has(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => handleToggleInterest(interest.id)}
                  aria-label={`${isSelected ? "Deselect" : "Select"} ${interest.name}`}
                  aria-pressed={isSelected}
                  style={{
                    ...quizOptionRow,
                    borderColor: isSelected ? "#113c2d" : "rgba(17,24,39,0.1)",
                    background: isSelected
                      ? "linear-gradient(135deg, #d9f99d 0%, #bbf7d0 100%)"
                      : "white",
                  }}
                >
                  <span style={quizOptionRowText}>{interest.name}</span>
                  <span
                    style={{
                      ...quizOptionRowCheck,
                      opacity: isSelected ? 1 : 0,
                    }}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
          </div>

          {saveError ? <Alert variant="error" className="mt-[length:var(--space-8)]">{saveError}</Alert> : null}
          {saveMessage ? <Alert variant="success" className="mt-[length:var(--space-8)]">{saveMessage}</Alert> : null}

          <div style={quizPhaseFooter}>
            <button
              type="button"
              onClick={() => {
                if (currentStep === 0) {
                  setQuizQuestionStep(ONBOARDING_QUIZ_QUESTIONS.length - 1);
                  setQuizPhase("quiz");
                } else {
                  handleBack();
                }
              }}
              style={ghostButton}
            >
              ← Back
            </button>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {!isAuthed && isLastStep ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/login", { state: { from: returnTo } })}
                    style={ghostButton}
                  >
                    Log in to save
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/register", { state: { from: returnTo } })}
                    style={primaryButton}
                  >
                    Create account
                  </button>
                </>
              ) : !isLastStep ? (
                <button type="button" onClick={handleNext} style={primaryButton}>
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  style={{
                    ...primaryButton,
                    opacity: isSaving || !hasAnySelection ? 0.72 : 1,
                    cursor: isSaving || !hasAnySelection ? "default" : "pointer",
                  }}
                  disabled={isSaving || !hasAnySelection}
                >
                  {isSaving ? "Saving..." : isAuthed ? "Finish" : "Finish later"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const page = {
  minHeight: "100%",
};


const eyebrow = {
  margin: 0,
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "#3f6212",
  fontWeight: 700,
};


const statusPill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "#113c2d",
  color: "white",
  fontWeight: 600,
  fontSize: "14px",
};


const quizPhaseShell = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  paddingTop: "48px",
  paddingBottom: "48px",
};

const quizPhaseCard = {
  width: "100%",
  maxWidth: "520px",
  padding: "32px 28px 28px",
  borderRadius: "28px",
  border: "1px solid rgba(15,23,42,0.08)",
  background:
    "radial-gradient(circle at top left, rgba(190,242,100,0.22), transparent 40%), linear-gradient(180deg, #ffffff 0%, #f7faf3 100%)",
  boxShadow: "0 24px 60px rgba(15,23,42,0.1)",
};

const quizPhaseTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "28px",
};

const quizDots = {
  display: "flex",
  gap: "5px",
  alignItems: "center",
  marginBottom: "22px",
};

const quizDot = {
  height: "8px",
  borderRadius: "999px",
  transition: "width 0.25s ease, background-color 0.25s ease",
};

const quizStepLabel = {
  margin: "0 0 6px 0",
  fontSize: "13px",
  fontWeight: 600,
  color: "#6b7280",
  letterSpacing: "0.04em",
};

const interestSubtitle = {
  margin: "0 0 20px 0",
  fontSize: "14px",
  fontWeight: 400,
  color: "#6b7280",
};

const quizQuestionHeading = {
  margin: "0 0 26px 0",
  fontSize: "clamp(1.35rem, 4vw, 1.9rem)",
  lineHeight: 1.25,
  fontWeight: 700,
  color: "#111827",
};

const quizOptionsList = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "28px",
};

const quizOptionRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "14px 18px",
  border: "1.5px solid rgba(17,24,39,0.1)",
  borderRadius: "14px",
  background: "white",
  textAlign: "left",
  cursor: "pointer",
  transition: "border-color 0.15s ease, background 0.15s ease",
};

const quizOptionRowText = {
  fontSize: "15px",
  fontWeight: 500,
  color: "#111827",
};

const quizOptionRowCheck = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#166534",
  transition: "opacity 0.15s ease",
  flexShrink: 0,
  marginLeft: "10px",
};

const quizPhaseFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};


const primaryButton = {
  border: "none",
  borderRadius: "999px",
  background: "#111827",
  color: "white",
  fontWeight: 600,
  fontSize: "14px",
  padding: "12px 20px",
};


const ghostButton = {
  border: "1px solid rgba(17, 24, 39, 0.12)",
  borderRadius: "999px",
  background: "transparent",
  color: "#111827",
  fontWeight: 600,
  fontSize: "14px",
  padding: "12px 20px",
};

const reviewInterestGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "22px",
};

const reviewInterestChip = {
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
  gap: "10px",
  padding: "10px 12px 10px 14px",
  borderRadius: "999px",
  border: "1px solid rgba(17,24,39,0.1)",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
};

const reviewInterestName = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "14px",
  fontWeight: 600,
  color: "#111827",
};

const removeInterestButton = {
  width: "24px",
  height: "24px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: "1px solid rgba(17,24,39,0.12)",
  borderRadius: "999px",
  background: "#f9fafb",
  color: "#374151",
  fontSize: "18px",
  lineHeight: 1,
  cursor: "pointer",
};

const emptyReviewState = {
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px dashed rgba(17,24,39,0.18)",
  background: "rgba(255,255,255,0.72)",
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "22px",
};

const manualAddRow = {
  display: "flex",
  gap: "10px",
  alignItems: "stretch",
  marginBottom: "28px",
};

const manualAddSelect = {
  flex: 1,
  minWidth: 0,
  border: "1.5px solid rgba(17,24,39,0.14)",
  borderRadius: "999px",
  background: "white",
  color: "#111827",
  fontSize: "14px",
  fontWeight: 500,
  padding: "0 16px",
};

const skeletonBar = {
  width: "38%",
  height: "14px",
  borderRadius: "999px",
};

const skeletonTitle = {
  width: "58%",
  height: "56px",
  borderRadius: "20px",
  marginTop: "20px",
};

const skeletonText = {
  width: "76%",
  height: "18px",
  borderRadius: "999px",
  marginTop: "20px",
};

const skeletonGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginTop: "26px",
};

const skeletonOption = {
  height: "148px",
  borderRadius: "24px",
};
