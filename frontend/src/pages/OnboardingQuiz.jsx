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

  const handleSelectQuestionOption = (questionId, optionId) => {
    setSaveMessage("");
    setSaveError("");
    setQuizAnswersByQuestionId((previous) => {
      const next = { ...previous, [questionId]: optionId };
      writeOnboardingQuizAnswers(Object.values(next));
      return next;
    });
  };

  const handleApplyQuizSuggestions = () => {
    if (suggestedInterestIds.length === 0) {
      setSaveError("Answer quiz questions to generate interest suggestions.");
      return;
    }
    setSaveError("");
    setSaveMessage("Quiz suggestions applied to your interests.");
    setSelectedIds((previous) => {
      const next = new Set(previous);
      suggestedInterestIds.forEach((interestId) => next.add(interestId));
      return next;
    });
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
        <section style={shell}>
          <div style={heroCard}>
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
        <section style={shell}>
          <div style={heroCard}>
            <p style={eyebrow}>Onboarding quiz</p>
            <h1 style={title}>We could not load the quiz</h1>
            <Alert variant="error" className="mt-[length:var(--space-6)]">
              {error}
            </Alert>
            <button type="button" style={primaryButton} onClick={() => window.location.reload()}>
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
        <section style={shell}>
          <div style={heroCard}>
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

  return (
    <div style={page}>
      <section style={shell}>
        <div style={heroCard}>
          <div style={heroHeader}>
            <div>
              <p style={eyebrow}>Personalize your JEAL experience</p>
              <h1 style={title}>Start with a quick interest quiz</h1>
            </div>
            <div style={headerActions}>
              <button type="button" onClick={handleSkipQuiz} style={ghostButton}>
                Skip quiz
              </button>
              <div style={statusPill}>
                {selectedIds.size} picked
              </div>
            </div>
          </div>

          <div style={progressHeader}>
            <div>
              <p style={progressLabel}>Step {currentStep + 1} of {totalSteps}</p>
              <h2 style={stepTitle}>{currentCategory.name}</h2>
              <p style={stepDescription}>
                {currentCategory.description ||
                  "Choose the options that feel most relevant to you."}
              </p>
            </div>
            <div style={progressMeta}>
              <span style={progressPercent}>{Math.round(progressValue)}%</span>
              <span style={progressHint}>
                {currentStepHasSelection
                  ? `${currentStepSelections.length} selected in this step`
                  : "Pick one or more to continue"}
              </span>
            </div>
          </div>

          <section style={quizQuestionSection}>
            <div style={quizQuestionHeader}>
              <p style={quizQuestionTitle}>Quick preference questions</p>
              <button type="button" onClick={handleApplyQuizSuggestions} style={ghostButton}>
                Apply suggestions
              </button>
            </div>
            <div style={quizQuestionGrid}>
              {ONBOARDING_QUIZ_QUESTIONS.map((question) => (
                <div key={question.id} style={quizQuestionCard}>
                  <p style={quizPrompt}>{question.prompt}</p>
                  <div style={quizOptionList}>
                    {question.options.map((option) => {
                      const isSelected = quizAnswersByQuestionId[question.id] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectQuestionOption(question.id, option.id)}
                          aria-label={`${isSelected ? "Selected option" : "Choose option"} ${option.label}`}
                          aria-pressed={isSelected}
                          style={{
                            ...quizOptionButton,
                            borderColor: isSelected ? "#113c2d" : "rgba(17, 24, 39, 0.12)",
                            backgroundColor: isSelected ? "#ecfccb" : "white",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${progressValue}%` }} />
          </div>

          <div style={optionsGrid}>
            {currentCategory.items.map((interest) => {
              const isSelected = selectedIds.has(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => handleToggleInterest(interest.id)}
                  aria-label={`${isSelected ? "Deselect" : "Select"} interest ${interest.name}`}
                  aria-pressed={isSelected}
                  style={{
                    ...optionCard,
                    borderColor: isSelected ? "#113c2d" : "rgba(17, 24, 39, 0.12)",
                    background: isSelected
                      ? "linear-gradient(135deg, #d9f99d 0%, #bbf7d0 100%)"
                      : "rgba(255, 255, 255, 0.78)",
                    boxShadow: isSelected
                      ? "0 18px 40px rgba(17, 60, 45, 0.14)"
                      : "0 10px 24px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <span style={optionTopRow}>
                    <span style={optionTitle}>{interest.name}</span>
                    <span
                      style={{
                        ...optionDot,
                        backgroundColor: isSelected ? "#113c2d" : "transparent",
                        borderColor: isSelected ? "#113c2d" : "rgba(17, 24, 39, 0.2)",
                      }}
                    />
                  </span>
                  <span style={optionDescription}>
                    {interest.description || "Add this topic to shape your recommendations."}
                  </span>
                </button>
              );
            })}
          </div>

          {saveError ? <Alert variant="error" className="mt-[length:var(--space-8)]">{saveError}</Alert> : null}
          {saveMessage ? <Alert variant="success" className="mt-[length:var(--space-8)]">{saveMessage}</Alert> : null}

          <div style={footer}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                ...secondaryButton,
                opacity: currentStep === 0 ? 0.5 : 1,
                cursor: currentStep === 0 ? "default" : "pointer",
              }}
              disabled={currentStep === 0}
            >
              Back
            </button>

            <div style={footerActions}>
              {!isAuthed ? (
                <button
                  type="button"
                  onClick={handleSkipQuiz}
                  style={ghostButton}
                >
                  Skip quiz
                </button>
              ) : null}
              {!isAuthed && isLastStep ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/login", {
                        state: { from: returnTo },
                      })
                    }
                    style={ghostButton}
                  >
                    Log in to save
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/register", {
                        state: { from: returnTo },
                      })
                    }
                    style={primaryButton}
                  >
                    Create account
                  </button>
                </>
              ) : null}

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={handleNext}
                  style={primaryButton}
                >
                  Next
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

const shell = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
};

const heroCard = {
  width: "100%",
  maxWidth: "1080px",
  padding: "32px",
  borderRadius: "32px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background:
    "radial-gradient(circle at top left, rgba(190, 242, 100, 0.34), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244, 247, 241, 0.98) 100%)",
  boxShadow: "0 30px 80px rgba(15, 23, 42, 0.09)",
  backdropFilter: "blur(16px)",
};

const heroHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "28px",
  flexWrap: "wrap",
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const eyebrow = {
  margin: 0,
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "#3f6212",
  fontWeight: 700,
};

const title = {
  margin: "10px 0 0 0",
  fontSize: "clamp(2.25rem, 5vw, 4.5rem)",
  lineHeight: 1,
  color: "#111827",
  maxWidth: "14ch",
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

const progressHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-end",
  marginBottom: "14px",
  flexWrap: "wrap",
};

const progressLabel = {
  margin: 0,
  color: "#4b5563",
  fontSize: "14px",
  fontWeight: 600,
};

const stepTitle = {
  margin: "4px 0 6px 0",
  fontSize: "30px",
  lineHeight: 1.1,
  color: "#111827",
};

const stepDescription = {
  margin: 0,
  color: "#4b5563",
  fontSize: "15px",
  maxWidth: "56ch",
};

const progressMeta = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "4px",
};

const progressPercent = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: 700,
  color: "#111827",
};

const progressHint = {
  fontSize: "13px",
  color: "#4b5563",
};

const progressTrack = {
  width: "100%",
  height: "12px",
  borderRadius: "999px",
  background: "rgba(17, 24, 39, 0.08)",
  overflow: "hidden",
  marginBottom: "26px",
};

const quizQuestionSection = {
  marginBottom: "20px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(17, 24, 39, 0.1)",
  background: "rgba(255, 255, 255, 0.75)",
};

const quizQuestionHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const quizQuestionTitle = {
  margin: 0,
  fontWeight: 700,
  color: "#111827",
  fontSize: "14px",
};

const quizQuestionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
};

const quizQuestionCard = {
  border: "1px solid rgba(17, 24, 39, 0.08)",
  borderRadius: "14px",
  padding: "10px",
  background: "white",
};

const quizPrompt = {
  margin: "0 0 8px 0",
  fontSize: "13px",
  fontWeight: 600,
  color: "#1f2937",
};

const quizOptionList = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const quizOptionButton = {
  border: "1px solid rgba(17, 24, 39, 0.12)",
  borderRadius: "999px",
  background: "white",
  color: "#111827",
  fontSize: "12px",
  fontWeight: 600,
  padding: "8px 10px",
  textAlign: "left",
};

const progressFill = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #84cc16 0%, #0f766e 100%)",
  transition: "width 0.2s ease",
};

const optionsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const optionCard = {
  border: "1px solid rgba(17, 24, 39, 0.12)",
  borderRadius: "24px",
  padding: "18px",
  textAlign: "left",
  minHeight: "148px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition:
    "transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
};

const optionTopRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
};

const optionTitle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
};

const optionDescription = {
  fontSize: "14px",
  color: "#374151",
  marginTop: "18px",
};

const optionDot = {
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  border: "2px solid rgba(17, 24, 39, 0.2)",
  flexShrink: 0,
};

const footer = {
  marginTop: "28px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const footerActions = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
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

const secondaryButton = {
  border: "1px solid rgba(17, 24, 39, 0.12)",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.72)",
  color: "#111827",
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
