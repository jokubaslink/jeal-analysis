import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

export const Input = forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "box-border w-full max-w-full rounded-[var(--radius-input)] border border-[var(--color-border-input)]",
        "bg-[rgba(255,255,255,0.92)] px-[length:var(--space-6)] py-[length:var(--space-5)] [font-size:var(--font-size-body)] text-[var(--color-ink)]",
        "placeholder:text-[var(--color-ink-subtle)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-green)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});
