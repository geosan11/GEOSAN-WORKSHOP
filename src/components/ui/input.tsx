import * as React from "react"
import { cn } from "@/src/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Mirrors legacy .field: app surface, hairline, mono 12px, gold focus */
        "w-full min-w-0 rounded-(--radius-control) border border-input bg-background px-3 py-[0.55rem] font-mono text-[0.75rem] text-foreground transition-[border-color,box-shadow] duration-[120ms] outline-none selection:bg-(--primary) selection:text-primary-foreground file:inline-flex file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-ring focus:shadow-[0_0_0_1px_var(--ring)]",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_var(--destructive)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
