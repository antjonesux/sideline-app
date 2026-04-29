"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-lg bg-primary font-heading text-sm font-semibold tracking-[0.1em] text-primary-foreground hover:bg-[var(--primary-hover)]",
        destructive:
          "rounded-lg border border-destructive/50 bg-transparent font-body text-sm font-semibold tracking-wide text-destructive hover:border-destructive hover:text-destructive",
        outline:
          "rounded-lg border border-input bg-background font-body text-sm font-medium hover:bg-accent hover:text-accent-foreground",
        secondary:
          "rounded-lg border border-input bg-transparent font-body text-sm font-medium tracking-wide text-muted-foreground hover:border-border hover:text-foreground",
        ghost: "rounded-md font-body text-sm hover:bg-accent hover:text-accent-foreground",
        link: "h-auto min-h-0 rounded-none p-0 font-body text-sm font-medium normal-case tracking-normal text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-9 rounded-md px-3 py-2 text-xs",
        lg: "min-h-11 px-4 py-4 font-heading text-base font-semibold tracking-[0.1em]",
        icon: "size-10 min-h-10 min-w-10 shrink-0 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
