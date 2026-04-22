import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import "./Main.css";

const featureCards = [
  {
    title: "Find clubs that fit",
    description:
      "Browse student organizations matched to your interests so you can spend less time searching and more time joining.",
  },
  {
    title: "See events worth showing up for",
    description:
      "Track upcoming events and opportunities in one place instead of piecing updates together from scattered sources.",
  },
  {
    title: "Build a more personal dashboard",
    description:
      "Save your interests, return to your picks, and keep your next steps organized after you sign in.",
  },
];

const stats = [
  { value: "1", label: "platform for clubs, events, and recommendations" },
  { value: "3", label: "core steps from discovery to sign-up" },
  { value: "24/7", label: "access to your saved interest profile" },
];

export default function Main() {
  const { isAuthed } = useAuth();

  const heroActions = isAuthed
    ? [
        { to: "/dashboard", label: "Go to dashboard", className: "landing-button landing-button--primary" },
        { to: "/clubs", label: "Explore clubs", className: "landing-button landing-button--secondary" },
        { to: "/events", label: "Browse events", className: "landing-button landing-button--ghost" },
      ]
    : [
        { to: "/register", label: "Create account", className: "landing-button landing-button--primary" },
        { to: "/login", label: "Log in", className: "landing-button landing-button--secondary" },
        { to: "/onboarding", label: "Try the interest quiz", className: "landing-button landing-button--ghost" },
      ];

  const sidePanel = isAuthed
    ? {
        title: "Ready to keep building your experience?",
        body:
          "Head back to your dashboard, refresh your interests, or keep exploring clubs and events that match you.",
        actions: [
          { to: "/dashboard", label: "Open dashboard", className: "landing-button landing-button--secondary" },
          { to: "/interests", label: "Update interests", className: "landing-button landing-button--dark-outline" },
        ],
      }
    : {
        title: "Ready to personalize your experience?",
        body:
          "Create an account to save your interests, or log in to pick up where you left off.",
        actions: [
          { to: "/register", label: "Register now", className: "landing-button landing-button--secondary" },
          { to: "/login", label: "Sign in", className: "landing-button landing-button--dark-outline" },
        ],
      };

  const banner = isAuthed
    ? {
        summary:
          "Jump back into your dashboard, browse new opportunities, or revisit the quiz to sharpen your recommendations.",
        actions: [
          { to: "/dashboard", label: "Open dashboard", className: "landing-button landing-button--secondary" },
          { to: "/onboarding", label: "Retake quiz", className: "landing-button landing-button--lime" },
        ],
      }
    : {
        summary:
          "Register for a new account, log in if you already have one, or take the interest quiz to preview the personalization flow.",
        actions: [
          { to: "/register", label: "Create account", className: "landing-button landing-button--secondary" },
          { to: "/onboarding", label: "Open quiz", className: "landing-button landing-button--lime" },
        ],
      };

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__glow landing-hero__glow--left" aria-hidden="true" />
        <div className="landing-hero__glow landing-hero__glow--right" aria-hidden="true" />

        <div className="landing-hero__grid">
          <div className="landing-hero__content">
            <div className="landing-copy">
              <p className="landing-eyebrow">Discover what JEAL offers</p>
              <h1 className="landing-hero__title">
                Find your next club, event, and community faster.
              </h1>
              <p className="landing-body landing-hero__summary">
                JEAL helps students explore campus opportunities, narrow interests,
                and move from curiosity to action before creating an account.
              </p>
            </div>

            <div className="landing-actions">
              {heroActions.map((action) => (
                <Link key={action.label} to={action.to} className={action.className}>
                  {action.label}
                </Link>
              ))}
            </div>

            <div className="landing-stats" aria-label="Platform highlights">
              {stats.map((item) => (
                <article key={item.label} className="landing-stat">
                  <p className="landing-stat__value">{item.value}</p>
                  <p className="landing-stat__label">{item.label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="landing-hero__side">
            <article className="landing-panel landing-panel--highlight">
              <p className="landing-eyebrow">Intro</p>
              <h2 className="landing-panel__title">A clearer first stop for exploring student life</h2>
              <p className="landing-body">
                Instead of signing up blind, visitors can understand how JEAL connects
                interests, clubs, and events before committing.
              </p>
            </article>

            <div className="landing-side-grid">
              <article className="landing-panel">
                <p className="landing-panel__label">What you can do</p>
                <h3 className="landing-panel__heading">Browse with confidence</h3>
                <p className="landing-body">
                  Learn the platform&apos;s value before signing in, then jump straight to
                  the right next step.
                </p>
              </article>

              <article className="landing-panel landing-panel--dark">
                <p className="landing-panel__label landing-panel__label--light">Call to action</p>
                <h3 className="landing-panel__heading landing-panel__heading--light">
                  {sidePanel.title}
                </h3>
                <p className="landing-panel__body landing-panel__body--light">
                  {sidePanel.body}
                </p>
                <div className="landing-actions landing-actions--compact landing-actions--stacked">
                  {sidePanel.actions.map((action) => (
                    <Link key={action.label} to={action.to} className={action.className}>
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__header">
          <p className="landing-eyebrow">Features</p>
          <h2 className="landing-section__title">
            Everything a new visitor needs to understand the platform
          </h2>
          <p className="landing-body landing-section__summary">
            The landing page introduces the value proposition, explains the core
            experience, and keeps account actions visible from the first screen.
          </p>
        </div>

        <div className="landing-feature-grid">
          {featureCards.map((feature, index) => (
            <article key={feature.title} className="landing-feature-card">
              <p className="landing-feature-card__index">0{index + 1}</p>
              <h3 className="landing-feature-card__title">{feature.title}</h3>
              <p className="landing-body">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-banner">
        <div className="landing-banner__content">
          <p className="landing-banner__eyebrow">Start here</p>
          <h2 className="landing-banner__title">
            Explore JEAL first, then choose the path that fits you.
          </h2>
          <p className="landing-banner__summary">
            {banner.summary}
          </p>
        </div>

        <div className="landing-actions landing-actions--banner">
          {banner.actions.map((action) => (
            <Link key={action.label} to={action.to} className={action.className}>
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
