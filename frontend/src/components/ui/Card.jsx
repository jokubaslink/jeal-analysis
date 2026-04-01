import { createElement } from "react";
import { cn } from "../../lib/cn.js";

/**
 * @param {import("react").HTMLAttributes<HTMLDivElement> & { className?: string; children?: import("react").ReactNode }} props
 */
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[length:var(--space-11)] shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** @param {{ as?: string } & import("react").HTMLAttributes<HTMLElement>} props */
export function CardTitle({ as = "h2", className, children, ...props }) {
  return createElement(
    as,
    {
      className: cn("m-0 text-[length:var(--font-size-h2)] font-bold text-[var(--color-ink)]", className),
      ...props,
    },
    children
  );
}

/**
 * @param {import("react").HTMLAttributes<HTMLParagraphElement> & { className?: string }} props
 */
export function CardDescription({ className, children, ...props }) {
  return (
    <p
      className={cn(
        "mt-2 text-[length:var(--font-size-body)] leading-[var(--line-height-relaxed)] text-[var(--color-ink-muted)]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
