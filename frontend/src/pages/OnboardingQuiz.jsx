import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  clearOnboardingSelections,
  clearOnboardingQuizAnswers,
  readOnboardingSelections,
  writeOnboardingQuizAnswers,
  writeOnboardingSelections,
} from "../onboarding/storage.js";
import {
  ONBOARDING_QUIZ_QUESTIONS,
  hydrateQuizAnswersFromStorage,
  computeBoostedCategoryScores,
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
  const [hasLoadedSavedSelections, setHasLoadedSavedSelections] = useState(false);
  const [quizAnswersByQuestionId, setQuizAnswersByQuestionId] = useState(() =>
    hydrateQuizAnswersFromStorage()
  );
  const [quizPhase, setQuizPhase] = useState(() => {
    const saved = hydrateQuizAnswersFromStorage();
    return Object.keys(saved).length >= ONBOARDING_QUIZ_QUESTIONS.length
      ? "interests"
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
  const progressValue = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const currentStepSelections = currentCategory
    ? currentCategory.items.filter((interest) => selectedIds.has(interest.id))
    : [];
  const currentStepHasSelection = currentStepSelections.length > 0;
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

  const handleSkipQuiz = () => {
    setSaveMessage("");
    setSaveError("");
    if (isAuthed) {
      navigate(returnTo, { replace: true });
      return;
    }
    navigate("/register", {
      state: { from: returnTo },
    });
  };

  const handleSelectAndAdvance = (questionId, optionId) => {
    if (isAdvancing) return;
    setSaveMessage("");
    setSaveError("");
    setIsAdvancing(true);

    const updatedAnswers = { ...quizAnswersByQuestionId, [questionId]: optionId };
    setQuizAnswersByQuestionId(updatedAnswers);
    writeOnboardingQuizAnswers(Object.values(updatedAnswers));

    const isLastQuestion = quizQuestionStep === ONBOARDING_QUIZ_QUESTIONS.length - 1;

    window.setTimeout(() => {
      setIsAdvancing(false);
      if (!isLastQuestion) {
        setQuizQuestionStep((q) => q + 1);
      } else {
        const allAnswerIds = Object.values(updatedAnswers);
        const boosted = computeBoostedCategoryScores(allAnswerIds);
        const suggested = suggestInterestIdsFromCategoryScores(boosted, categories, interests);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          suggested.forEach((id) => next.add(id));
          return next;
        });
        setQuizPhase("interests");
      }
    }, 280);
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

      clearOnboardingSelections();
      clearOnboardingQuizAnswers();
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
  }, [hasAnySelection, logout, navigate, returnTo, selectedIds, userId]);

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
