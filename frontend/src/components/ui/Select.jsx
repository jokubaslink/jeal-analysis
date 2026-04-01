import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "box-border w-full max-w-full cursor-pointer rounded-[var(--radius-input)] border border-[var(--color-border-input)]",
        "bg-[rgba(255,255,255,0.92)] px-[length:var(--space-6)] py-[length:var(--space-5)] [font-size:var(--font-size-body)] text-[var(--color-ink)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-green)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
