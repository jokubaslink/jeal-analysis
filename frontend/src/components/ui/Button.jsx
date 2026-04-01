import { cn } from "../../lib/cn.js";

const variants = {
  primary:
    "border-transparent bg-[var(--color-ink)] text-[var(--color-surface)] hover:opacity-90",
  secondary:
    "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-bg-page-top)]",
  ghost:
    "border-transparent bg-transparent text-[var(--color-ink)] hover:bg-[rgba(17,24,39,0.06)]",
};

/**
 * @param {{
 *   variant?: "primary" | "secondary" | "ghost";
 *   type?: "button" | "submit" | "reset";
 *   className?: string;
 *   disabled?: boolean;
 *   children?: import("react").ReactNode;
 * } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({
  variant = "primary",
  type = "button",
  className,
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center border font-bold transition-opacity duration-[var(--duration-fast)]",
        "rounded-[var(--radius-pill)] px-[length:var(--space-6)] py-[length:var(--space-5)] [font-size:var(--font-size-body)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-green)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant] ?? variants.primary,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
