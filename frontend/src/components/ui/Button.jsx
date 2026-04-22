import { cloneElement, isValidElement } from "react";
import { cn } from "../../lib/cn.js";

const variants = {
  primary:
    "border-transparent bg-[var(--color-ink)] text-[var(--color-surface)] shadow-sm hover:opacity-95 hover:shadow-md active:scale-[0.98]",
  secondary:
    "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-bg-page-top)] hover:border-[var(--color-border-strong)] active:scale-[0.98]",
  ghost:
    "border-transparent bg-transparent text-[var(--color-ink)] hover:bg-[rgba(17,24,39,0.06)] active:scale-[0.98]",
};

/**
 * @param {{
 *   variant?: "primary" | "secondary" | "ghost";
 *   asChild?: boolean;
 *   type?: "button" | "submit" | "reset";
 *   className?: string;
 *   disabled?: boolean;
 *   children?: import("react").ReactNode;
 * } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({
  variant = "primary",
  asChild = false,
  type = "button",
  className,
  disabled,
  children,
  ...props
}) {
  const classes = cn(
    "inline-flex cursor-pointer items-center justify-center border font-bold",
    "transition-[transform,opacity,box-shadow] duration-[var(--duration-fast)] motion-reduce:transition-none motion-reduce:active:scale-100",
    "rounded-[var(--radius-pill)] px-[length:var(--space-6)] py-[length:var(--space-5)] [font-size:var(--font-size-body)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-green)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant] ?? variants.primary,
    className
  );

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      className: cn(classes, children.props.className),
    });
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}
