import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "border-blue-300/40 bg-blue-400/14 text-blue-100",
        purple: "border-zinc-300/30 bg-zinc-200/10 text-zinc-200",
        success: "border-emerald-300/45 bg-emerald-400/14 text-emerald-100",
        danger: "border-red-300/45 bg-red-400/14 text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
