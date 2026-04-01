import { forwardRef } from "react";
import { cn } from "../../lib/cn.js";

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "box-border min-h-[100px] w-full max-w-full resize-y rounded-[var(--radius-input)] border border-[var(--color-border-input)]",
        "bg-[rgba(255,255,255,0.92)] px-[length:var(--space-6)] py-[length:var(--space-5)] [font-size:var(--font-size-body)] text-[var(--color-ink)]",
        "font-inherit placeholder:text-[var(--color-ink-subtle)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-green)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});
