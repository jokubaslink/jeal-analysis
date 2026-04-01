import { cn } from "../../lib/cn.js";

const variants = {
  success:
    "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  error:
    "border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
};

/**
 * @param {{
 *   variant?: "success" | "error";
 *   className?: string;
 *   children?: import("react").ReactNode;
 *   role?: string;
 * } & import("react").HTMLAttributes<HTMLDivElement>} props
 */
export function Alert({ variant = "error", className, children, role, ...props }) {
  return (
    <div
      role={role ?? (variant === "error" ? "alert" : "status")}
      className={cn(
        "rounded-[var(--radius-md)] border px-[length:var(--space-5)] py-[length:var(--space-5)] [font-size:var(--font-size-small)] font-bold",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
