import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "cs2-action-btn inline-flex transform-gpu items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-sm font-semibold uppercase tracking-[0.14em] transition-all duration-180 ease-out hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "cs2-btn-go",
        secondary:
          "cs2-btn-ct",
        outline:
          "cs2-btn-t",
        ghost:
          "cs2-btn-ghost",
        destructive:
          "cs2-btn-cancel",
      },
      size: {
        sm: "h-8 px-3 text-[11px]",
        md: "h-10 px-4 text-[12px]",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  intent?: "primary" | "secondary" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, intent, size, className, ...props },
  ref,
) {
  const resolvedVariant =
    variant ??
    (intent === "secondary"
      ? "secondary"
      : intent === "ghost"
        ? "ghost"
        : "default");

  return <button ref={ref} className={cn(buttonVariants({ variant: resolvedVariant, size }), className)} {...props} />;
});

Button.displayName = "Button";
