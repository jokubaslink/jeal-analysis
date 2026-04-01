import { cn } from "../../lib/cn.js";

/**
 * @param {import("react").LabelHTMLAttributes<HTMLLabelElement> & { className?: string }} props
 */
export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        "block text-[length:var(--font-size-small)] font-bold text-[var(--color-ink)]",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
