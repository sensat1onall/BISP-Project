"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-primary-foreground hover:bg-destructive/90",
        cool: "dark:inset-shadow-2xs dark:inset-shadow-white/10 bg-linear-to-t border border-b-2 border-zinc-950/40 from-primary to-primary/85 shadow-md shadow-primary/20 ring-1 ring-inset ring-white/25 transition-[filter] duration-200 hover:brightness-110 active:brightness-90 dark:border-x-0 text-primary-foreground dark:text-primary-foreground dark:border-t-0 dark:border-primary/50 dark:ring-white/5",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants, liquidbuttonVariants, LiquidButton }

const liquidbuttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap text-sm font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40",
  {
    variants: {
      variant: {
        default: "text-white/90",
        destructive: "text-red-100",
        outline: "text-white/80",
        secondary: "text-white/80",
        ghost: "text-white/70",
        link: "text-white underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-3",
        sm: "h-8 text-xs gap-1.5 px-4 has-[>svg]:px-4",
        lg: "h-11 px-7 has-[>svg]:px-4",
        xl: "h-12 px-8 has-[>svg]:px-6",
        xxl: "h-14 px-10 has-[>svg]:px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "xxl",
    },
  }
)

function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof liquidbuttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300 ease-out",
        "hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]",
        liquidbuttonVariants({ variant, size, className })
      )}
      {...props}
    >
      {/* Glass background layer */}
      <div className="absolute inset-0 rounded-2xl bg-white/[0.08] backdrop-blur-xl" />

      {/* Gradient shimmer border */}
      <div className="absolute inset-0 rounded-2xl border border-white/[0.15]" />

      {/* Top highlight edge */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Inner glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-b from-white/[0.08] to-transparent" />

      {/* Subtle refraction highlight */}
      <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] rotate-12 opacity-[0.04] bg-gradient-to-br from-white via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
        {children}
      </span>
    </Comp>
  )
}


type ColorVariant =
  | "default"
  | "primary"
  | "success"
  | "error"
  | "gold"
  | "bronze";

interface MetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ColorVariant;
}

const glassColors: Record<
  ColorVariant,
  {
    bg: string;
    border: string;
    glow: string;
    text: string;
    hoverGlow: string;
  }
> = {
  default: {
    bg: "bg-white/[0.07]",
    border: "border-white/[0.15]",
    glow: "shadow-[0_0_20px_rgba(255,255,255,0.05)]",
    text: "text-white/90",
    hoverGlow: "group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1),inset_0_0_30px_rgba(255,255,255,0.05)]",
  },
  primary: {
    bg: "bg-blue-500/[0.12]",
    border: "border-blue-300/[0.2]",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]",
    text: "text-blue-100",
    hoverGlow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2),inset_0_0_30px_rgba(59,130,246,0.08)]",
  },
  success: {
    bg: "bg-emerald-500/[0.12]",
    border: "border-emerald-300/[0.2]",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.1)]",
    text: "text-emerald-100",
    hoverGlow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2),inset_0_0_30px_rgba(16,185,129,0.08)]",
  },
  error: {
    bg: "bg-red-500/[0.12]",
    border: "border-red-300/[0.2]",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)]",
    text: "text-red-100",
    hoverGlow: "group-hover:shadow-[0_0_30px_rgba(239,68,68,0.2),inset_0_0_30px_rgba(239,68,68,0.08)]",
  },
  gold: {
    bg: "bg-amber-500/[0.12]",
    border: "border-amber-300/[0.2]",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.1)]",
    text: "text-amber-100",
    hoverGlow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.2),inset_0_0_30px_rgba(245,158,11,0.08)]",
  },
  bronze: {
    bg: "bg-orange-500/[0.12]",
    border: "border-orange-300/[0.2]",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.1)]",
    text: "text-orange-100",
    hoverGlow: "group-hover:shadow-[0_0_30px_rgba(249,115,22,0.2),inset_0_0_30px_rgba(249,115,22,0.08)]",
  },
};

export const MetalButton = React.forwardRef<
  HTMLButtonElement,
  MetalButtonProps
>(({ children, className, variant = "default", ...props }, ref) => {
  const colors = glassColors[variant];

  return (
    <button
      ref={ref}
      className={cn(
        "group relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-2.5 text-sm font-semibold outline-none",
        "transition-all duration-300 ease-out",
        "hover:scale-[1.03] active:scale-[0.97]",
        "focus-visible:ring-2 focus-visible:ring-white/30",
        "disabled:pointer-events-none disabled:opacity-40",
        colors.text,
        colors.glow,
        colors.hoverGlow,
        className
      )}
      {...props}
    >
      {/* Frosted glass background */}
      <div className={cn(
        "absolute inset-0 rounded-2xl backdrop-blur-xl transition-all duration-300",
        colors.bg,
      )} />

      {/* Border */}
      <div className={cn(
        "absolute inset-0 rounded-2xl border transition-all duration-300",
        colors.border,
      )} />

      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Bottom subtle edge */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Hover shimmer */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-b from-white/[0.06] to-transparent" />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
        {children}
      </span>
    </button>
  );
});

MetalButton.displayName = "MetalButton";
