import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/src/lib/utils"
import { Slot } from "radix-ui"

/*
 * Mirrors the legacy .btn primitives in src/index.css:
 *   default   = .btn-primary (gold, dark ink text)
 *   secondary = .btn-ink
 *   outline   = .btn-ghost (it has a hairline)
 *   ghost     = borderless ghost
 * Mono / uppercase / 11px lives in the cva base, not at call sites.
 * Focus uses the global gold :focus-visible outline, like .btn.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-(--radius-control) border border-transparent font-mono text-[11px] leading-none font-bold tracking-[.04em] whitespace-nowrap uppercase transition-[background-color,border-color,color,transform] duration-[120ms] ease-[ease] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-(--primary) bg-(--primary) text-primary-foreground hover:border-(--primary-hover) hover:bg-(--primary-hover)",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground hover:border-black hover:bg-black hover:brightness-108 dark:hover:border-secondary dark:hover:bg-secondary dark:hover:brightness-92",
        outline:
          "border-border bg-transparent text-foreground hover:border-(--border-strong) hover:bg-[rgba(17,17,17,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)]",
        ghost:
          "bg-transparent text-foreground hover:bg-[rgba(17,17,17,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)]",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:brightness-108 dark:hover:brightness-92",
        link: "h-auto border-0 bg-transparent px-0 py-0 text-(--color-gold-text) underline-offset-4 hover:underline",
      },
      size: {
        default: "px-3.5 py-2",
        sm: "px-2.5 py-1.5",
        lg: "px-5 py-2.5",
        icon: "size-8 p-0",
        "icon-sm": "size-7 p-0",
      },
      shape: {
        default: "",
        pill: "rounded-(--radius-pill) px-[1.1rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  shape = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
