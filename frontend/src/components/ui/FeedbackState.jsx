import { cn } from "../../lib/cn.js";

const toneClasses = {
  neutral: "border-[var(--color-border)] bg-[rgba(255,255,255,0.78)] text-[var(--color-ink)]",
  loading: "border-[var(--color-border)] bg-[rgba(255,255,255,0.78)] text-[var(--color-ink)]",
  empty: "border-[var(--color-border-medium)] bg-[var(--color-bg-page-top)] text-[var(--color-ink)]",
};

/**
 * @param {{
 *   title: string;
 *   description?: string;
 *   tone?: "neutral" | "loading" | "empty";
 *   className?: string;
 *   action?: import("react").ReactNode;
 *   icon?: import("react").ReactNode;
 *   align?: "left" | "center";
 * } & import("react").HTMLAttributes<HTMLDivElement>} props
 */
export function FeedbackState({
  title,
  description,
  tone = "neutral",
  className,
  action,
  icon,
  align = "center",
  ...props
}) {
  const alignClass = align === "left" ? "items-start text-left" : "items-center text-center";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-[length:var(--space-4)] rounded-[var(--radius-lg)] border p-[length:var(--space-8)]",
        alignClass,
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {icon ? <div className="flex items-center justify-center">{icon}</div> : null}
      <div className="flex flex-col gap-[length:var(--space-2)]">
        <p className="m-0 text-[length:var(--font-size-h3)] font-bold leading-[var(--line-height-snug)]">{title}</p>
        {description ? (
          <p className="m-0 text-[length:var(--font-size-body)] leading-[var(--line-height-relaxed)] text-[var(--color-ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex">{action}</div> : null}
    </div>
  );
}

/**
 * @param {{
 *   label?: string;
 *   className?: string;
 * } & import("react").HTMLAttributes<HTMLSpanElement>} props
 */
export function Spinner({ label = "Loading", className, ...props }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex h-7 w-7 animate-spin rounded-full border-[3px] border-[var(--color-border-medium)] border-t-[var(--color-brand-green)]",
        className
      )}
      {...props}
    />
  );
}

/**
 * @param {{
 *   className?: string;
 * } & import("react").HTMLAttributes<HTMLDivElement>} props
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-[var(--radius-md)] bg-[linear-gradient(90deg,#eef2e7_0%,#d7dfcf_40%,#eef2e7_80%)] bg-[length:200%_100%] animate-[jeal-skeleton-pulse_1.4s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  );
}

/**
 * @param {{
 *   title?: string;
 *   description?: string;
 *   className?: string;
 *   action?: import("react").ReactNode;
 *   align?: "left" | "center";
 * } & import("react").HTMLAttributes<HTMLDivElement>} props
 */
export function LoadingState({
  title = "Loading",
  description = "Please wait while we fetch your data.",
  className,
  action,
  align,
  ...props
}) {
  return (
    <FeedbackState
      title={title}
      description={description}
      tone="loading"
      icon={<Spinner label={title} />}
      action={action}
      align={align}
      className={cn("jeal-feedback-enter", className)}
      {...props}
    />
  );
}

/**
 * @param {{
 *   title: string;
 *   description?: string;
 *   className?: string;
 *   action?: import("react").ReactNode;
 *   align?: "left" | "center";
 * } & import("react").HTMLAttributes<HTMLDivElement>} props
 */
export function EmptyState({ title, description, className, action, align, ...props }) {
  return (
    <FeedbackState
      title={title}
      description={description}
      tone="empty"
      action={action}
      align={align}
      className={className}
      {...props}
    />
  );
}
