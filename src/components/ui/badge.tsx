import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/src/lib/utils"
import { Slot } from "radix-ui"

/*
 * Mirrors the legacy .stamp primitives in src/index.css:
 *   default     = .stamp          primary = .stamp-primary
 *   success     = .stamp-success  warning = .stamp-warn
 *   destructive = .stamp-danger   outline = hairline, transparent
 * Square status dot: pass <span data-icon /> as the first child.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 overflow-hidden rounded-(--radius-stamp) border px-[0.45rem] py-[0.2rem] font-mono text-[length:var(--text-meta)] leading-[1.2] font-bold tracking-(--tracking-meta) whitespace-nowrap uppercase [&>svg]:pointer-events-none [&>svg]:size-3 [&>[data-icon]]:size-1.5 [&>[data-icon]]:shrink-0 [&>[data-icon]]:bg-current",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-muted-foreground",
        primary:
          "border-[rgba(240,178,48,0.45)] bg-accent text-(--color-gold-text)",
        success:
          "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-(--success-foreground)",
        warning:
          "border-[color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-(--warning-foreground)",
        destructive:
          "border-[color-mix(in_srgb,var(--destructive)_45%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-(--destructive-text)",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
